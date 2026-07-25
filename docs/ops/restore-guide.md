# Restore Guide

## Reality check first

Body Tracker's current runtime uses an **in-memory data store**
(`src/server/db/store.ts`) — there is no live Postgres database in this
environment to restore into today. `scripts/restore-db.sh` is a real, working
script, correct against the intended production database
(`prisma/schema.prisma`, provisioned via `docker-compose.yml`'s `postgres`
service, populated by backups from `scripts/backup-db.sh` — see
`docs/ops/backup-guide.md`). Everywhere a real Postgres instance and a real
backup file exist, this script runs exactly as documented below. The
verification steps that reference `/api/v1/health/ready` and
`/api/v1/status`'s `dataStore` counts apply once the app is Prisma-backed;
right now those endpoints report on the in-memory store instead (see the
"today" note in the verification section).

---

## When to use this

- **Disaster recovery** — the production database is lost, corrupted, or the
  host it ran on is gone, and you're restoring from the most recent backup
  onto a fresh Postgres instance.
- **Rolling back a bad migration or bad deploy** — a schema migration or a
  buggy write path corrupted data, and the fastest safe path forward is
  restoring to a known-good backup taken before the bad change landed (then
  re-applying only the migrations you actually want).
- **Standing up a staging/QA replica from a production snapshot** — restoring
  a prod backup into a separate staging database to reproduce a bug against
  realistic data, without touching production.

In all three cases, `DATABASE_URL` determines the target database — the
script has no concept of "production" vs. "staging" beyond whatever
connection string you give it. Double-check `DATABASE_URL` before running
this, every time — see the safety pause below.

---

## What the script does

`scripts/restore-db.sh`:

```bash
DATABASE_URL=... ./scripts/restore-db.sh <path-to-backup.sql.gz[.enc]>
```

1. Requires `DATABASE_URL` (fails fast if unset) and a backup file path as
   `$1` (fails with a usage message if omitted).
2. If the filename ends in `.enc`, requires `BACKUP_ENCRYPTION_KEY` and
   decrypts first:
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -in "$BACKUP_FILE" -out "$DECRYPTED" -pass "pass:${BACKUP_ENCRYPTION_KEY}"
   ```
   producing a plaintext `.sql.gz` alongside it (same path, `.enc` stripped),
   and continues using that decrypted file for the rest of the run.
3. Prints a warning naming the target `DATABASE_URL` and **sleeps 5 seconds**
   before doing anything destructive — this is your last chance to `Ctrl+C`
   if the target is wrong.
4. Restores: `gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"` — streams the
   decompressed SQL directly into `psql` against the target database. This is
   **not** a clean/empty-database restore by itself: because
   `scripts/backup-db.sh` produces a plain SQL dump of statements (`INSERT`s
   etc. against existing table structure, not a `DROP`+`CREATE` sequence
   unless your dump includes one), restoring into a database that already has
   conflicting data can produce constraint errors rather than a clean
   overwrite. In practice this script is meant to be run against an **empty**
   target database (a fresh `prisma migrate deploy` with no rows, or a
   database you've explicitly wiped) — see the disaster-recovery walkthrough
   below for exactly when to do that.
5. If it decrypted a file in step 2, deletes the plaintext intermediate
   afterward (`rm -f "$BACKUP_FILE"` on the decrypted copy — the original
   `.enc` file is left untouched).
6. Prints `==> Restore complete.`

Like `backup-db.sh`, this script has `set -euo pipefail` — a failed `psql`
statement partway through aborts the script, but note that `psql` by default
continues past individual statement errors within a plain-SQL restore unless
you're on a version/flag combination that stops on first error; check
`psql`'s output carefully rather than trusting a zero-ish exit code alone
for partial-failure cases.

---

## The 5-second safety pause

```
==> About to restore into: postgresql://user:***@host:5432/dbname
==> This will overwrite existing data. Press Ctrl+C within 5s to abort.
```

followed by `sleep 5`. This exists because a restore is **destructive** —
there is no confirmation prompt requiring typed input (so it stays scriptable
for real disaster-recovery automation), but there is a fixed window where a
human running it interactively can see exactly which `DATABASE_URL` is about
to be overwritten and abort before `psql` starts executing. Always read that
printed URL before letting the 5 seconds elapse — it's the only checkpoint
between "I ran this script" and "production's data is being overwritten."

If you're calling this from fully unattended automation (e.g. an automated
staging-refresh job), that's fine — the sleep just adds 5 seconds to the job,
it doesn't block on any input. The safety value is specifically for humans
running this by hand.

---

## Usage examples

### Plain (unencrypted) backup

```bash
DATABASE_URL="postgresql://body_tracker:body_tracker@localhost:5432/body_tracker" \
  ./scripts/restore-db.sh /var/backups/body-tracker/body-tracker-20260724T021500Z.sql.gz
```

### Encrypted backup

```bash
DATABASE_URL="postgresql://body_tracker:body_tracker@localhost:5432/body_tracker" \
BACKUP_ENCRYPTION_KEY="$(cat /etc/body-tracker/backup.key)" \
  ./scripts/restore-db.sh /var/backups/body-tracker/body-tracker-20260724T021500Z.sql.gz.enc
```

If `BACKUP_ENCRYPTION_KEY` is missing or wrong for an `.enc` file, the
`openssl enc -d` step fails (bad key/corrupt padding), the script aborts
under `set -e`, and nothing is restored — safe failure mode.

---

## Verifying the restore

### Once the app is Prisma-backed (the designed target)

1. `psql` directly against the restored database and spot-check row counts
   per table against what you expect from the backup's source environment:
   ```bash
   psql "$DATABASE_URL" -c "select count(*) from organizations;"
   psql "$DATABASE_URL" -c "select count(*) from users;"
   psql "$DATABASE_URL" -c "select count(*) from tracking_sessions;"
   ```
   (table names are the `@@map(...)` snake_case names from
   `prisma/schema.prisma` — `organizations`, `users`, `tracking_sessions`,
   `tracking_events`, `analytics_snapshots`, `reports`, `webhooks`,
   `webhook_deliveries`, `refresh_tokens`, `api_keys`, `audit_log`, `teams`.)
2. Point the app's `DATABASE_URL` at the restored database and hit:
   - `GET /api/v1/health/ready` — should return `{"ready": true, "checks":
{"env": {"ok": true}, "dataStore": {"ok": true}, ...}}` with HTTP 200.
     Once Prisma-backed, this route's `dataStore` check should be doing a
     real connectivity probe against the restored DB rather than the current
     `store.organizations.size > 0` in-memory check (see the route's own
     comment in `src/app/api/v1/health/ready/route.ts` marking exactly where
     that real check lands).
   - `GET /api/v1/status` — inspect the `dataStore` block for entity counts
     (`organizations`, `users`, `trackingSessions`, `reports`, `webhooks`,
     `apiKeys`) and sanity-check them against the pre-incident counts you
     expect (e.g. from the last known-good `/api/v1/status` snapshot, a
     monitoring dashboard, or the row counts from step 1).
3. Smoke-test a couple of real user flows against the restored data (log in
   as a known seed/test user, list their tracking sessions, confirm a report
   downloads) rather than trusting counts alone — row counts matching doesn't
   guarantee referential integrity or that the _right_ backup was restored.

### Today (in-memory store)

`/api/v1/status`'s `dataStore` block currently reports in-memory `Map` sizes
(`store.organizations.size`, etc.), not a Postgres row count, and
`/api/v1/health/ready`'s `dataStore` check currently tests
`store.organizations.size > 0` against that same in-memory store — neither
reflects a Postgres restore because the app doesn't read from Postgres yet.
Until the store migration in `docs/ops/database-guide.md` happens, "verifying
a restore" is limited to step 1 above (`psql` row counts) run directly
against the restored database, independent of the running app.

---

## Disaster scenario walkthrough: accidentally dropped a table in production

A concrete example tying the whole flow together — say someone ran a bad
migration or a manual `DROP TABLE tracking_sessions;` directly against
production.

**1. Stop the bleeding.** Put the app in maintenance mode or scale it to zero
if writes are actively making things worse (e.g. foreign-key errors cascading
from the missing table). Don't let the app keep writing against a
half-broken schema while you plan the restore.

**2. Identify the right backup.** List what's available and pick the most
recent backup taken _before_ the drop:

```bash
ls -lh /var/backups/body-tracker/ | grep body-tracker
```

Filenames are UTC timestamps (`body-tracker-20260724T021500Z.sql.gz[.enc]`),
so if the drop happened at, say, `2026-07-24T14:32Z`, you want the backup
from `02:15Z` that same day (assuming the nightly `02:15 UTC` cron job from
`docs/ops/backup-guide.md`) — anything after the incident is either the
already-broken state or doesn't exist yet. If backups are also shipped
off-host, confirm you're pulling from the same source of truth and not an
older stale replica.

**3. Stand up (or clear) a target database.** Restoring into the same
already-partially-broken production database is risky — prefer restoring
into a **fresh** database first:

```bash
# Fresh Postgres instance/database, e.g. a new logical DB on the same
# server, or spin up docker-compose.yml's postgres service if rebuilding
# from scratch:
docker compose up -d postgres
createdb -h localhost -U body_tracker body_tracker_restore
```

**4. Run the restore against the fresh target:**

```bash
DATABASE_URL="postgresql://body_tracker:body_tracker@localhost:5432/body_tracker_restore" \
BACKUP_ENCRYPTION_KEY="$(cat /etc/body-tracker/backup.key)" \
  ./scripts/restore-db.sh /var/backups/body-tracker/body-tracker-20260724T021500Z.sql.gz.enc
```

Read the printed target URL during the 5-second pause — confirm it says
`body_tracker_restore`, not the live production database, before it
proceeds.

**5. Verify against the restored copy** (per the "Verifying the restore"
section above): row counts via `psql`, and once app-connected,
`/api/v1/health/ready` and `/api/v1/status`'s `dataStore` counts. Confirm the
previously-dropped table (`tracking_sessions`) exists again and has rows
matching pre-incident expectations.

**6. Cut over.** Once the restored copy is verified:

- Either repoint production's `DATABASE_URL` at the restored database
  (rename it into place / promote it), or
- Restore the same backup directly into the original production database
  after first ensuring its schema is in a restorable state (re-running
  `prisma migrate deploy` to recreate the dropped table's structure before
  the `psql` step lands data into it, if the table itself — not just its
  rows — was destroyed).

**7. Account for data loss between the backup and the incident.** Any writes
between `02:15Z` (backup time) and `14:32Z` (incident time) are gone unless
you have another recovery path (application-level audit log replay from
`AuditLogEntry`, a WAL-archiving setup for point-in-time recovery — not
covered by this script, which only does full-dump snapshots on the
`RETENTION_DAYS`-day cadence configured in `docs/ops/backup-guide.md`). If
that gap is unacceptable, this is the point to evaluate adding continuous
WAL archiving / PITR on top of the daily `pg_dump` snapshots this script
provides.

**8. Resume traffic**, and afterward, do a blameless review of how the table
got dropped in the first place (migration review process, `DROP` statements
requiring a second approver, etc.) — the backup/restore tooling is the safety
net, not the fix for the underlying process gap.

---

## See also

- `docs/ops/backup-guide.md` — how the backups this script consumes are
  produced, encrypted, and retained.
- `docs/ops/database-guide.md` — the schema being restored, and the current
  in-memory-store reality this doesn't yet apply to.
- `docs/ops/environment-variables.md` — canonical reference for
  `DATABASE_URL` and `BACKUP_ENCRYPTION_KEY`.
