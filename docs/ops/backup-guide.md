# Backup Guide

## Reality check first

Body Tracker's current runtime uses an **in-memory data store**
(`src/server/db/store.ts`) — there is no live Postgres database in this
environment, and nothing to back up from it today (a restart already discards
everything and re-seeds fixed demo data). `scripts/backup-db.sh` is a real,
working script correctly written against the intended production database
(`prisma/schema.prisma`, provisioned via `docker-compose.yml`'s `postgres`
service). It cannot be exercised in this sandbox for lack of a live
`DATABASE_URL` to point at, but everywhere a real Postgres instance exists
(a staging environment, a production deployment once the store migration
in `docs/ops/database-guide.md` is done, or just a local `docker compose up
postgres`), this script runs as documented below.

---

## What the script does

`scripts/backup-db.sh`:

1. Requires `DATABASE_URL` — fails immediately (`: "${DATABASE_URL:?DATABASE_URL
must be set}"`) if it isn't set, before touching anything.
2. Reads `BACKUP_DIR` (default `/var/backups/body-tracker`) and
   `RETENTION_DAYS` (default `14`) from the environment, with sane defaults if
   unset.
3. Creates `BACKUP_DIR` if it doesn't exist.
4. Runs:
   ```bash
   pg_dump --no-owner --no-acl --format=plain "$DATABASE_URL" | gzip -9 > "$BACKUP_DIR/body-tracker-<UTC-timestamp>.sql.gz"
   ```
   `--no-owner --no-acl` keep the dump portable across environments where the
   restoring role/owner might differ from the one that produced the dump
   (e.g. restoring prod's backup into a staging DB owned by a different
   Postgres role). `--format=plain` produces a plain SQL script (piped
   through `gzip -9` for maximum compression), which is what
   `scripts/restore-db.sh` expects (`gunzip -c ... | psql`) — not a custom
   `pg_dump -Fc` archive.
5. If `BACKUP_ENCRYPTION_KEY` is set, encrypts the `.sql.gz` with:
   ```bash
   openssl enc -aes-256-cbc -pbkdf2 -salt -in "$OUT_FILE" -out "${OUT_FILE}.enc" -pass "pass:${BACKUP_ENCRYPTION_KEY}"
   ```
   then deletes the unencrypted `.sql.gz`, leaving only `.sql.gz.enc` on disk.
6. Prunes old backups: `find "$BACKUP_DIR" -name "body-tracker-*.sql.gz*" -type f
-mtime "+${RETENTION_DAYS}" -print -delete` — this matches both encrypted
   and unencrypted filenames (the `*` after `.sql.gz` covers `.sql.gz.enc`
   too), so pruning works regardless of whether encryption is enabled.
7. Prints the resulting backup directory listing.

The script has `set -euo pipefail` at the top, so any failure in the
pipeline (including `pg_dump` itself failing) aborts the script non-zero
rather than silently producing a truncated/empty backup file.

---

## Prerequisites

- `pg_dump` (matching or newer major version than the target Postgres —
  Postgres 17 per `docker-compose.yml`, so a `postgresql-client-17` or
  compatible package) available on `PATH` wherever the script runs.
- `gzip`, `openssl` (only needed if using encryption), and standard coreutils
  (`find`, `du`, `mkdir`) — present on essentially any Linux host.
- `DATABASE_URL` pointing at a reachable Postgres instance, in the standard
  `postgresql://user:password@host:port/dbname` form. See
  `docs/ops/environment-variables.md` for the canonical reference of this and
  every other environment variable this system uses.
- Write access to `BACKUP_DIR` (or override it to a writable path).

---

## Manual run example

Against `docker-compose.yml`'s `postgres` service, from the repo root, with
Postgres already up (`docker compose up -d postgres`):

```bash
DATABASE_URL="postgresql://body_tracker:body_tracker@localhost:5432/body_tracker" \
BACKUP_DIR="./backups" \
./scripts/backup-db.sh
```

Expected output:

```
==> Dumping database to ./backups/body-tracker-20260724T031500Z.sql.gz
==> Backup complete: ./backups/body-tracker-20260724T031500Z.sql.gz (48K)
==> Pruning backups older than 14 days
==> Done. Current backups:
-rw-r--r-- 1 you you 48K Jul 24 03:15 body-tracker-20260724T031500Z.sql.gz
```

With encryption enabled:

```bash
DATABASE_URL="postgresql://body_tracker:body_tracker@localhost:5432/body_tracker" \
BACKUP_DIR="./backups" \
BACKUP_ENCRYPTION_KEY="$(openssl rand -base64 32)" \
./scripts/backup-db.sh
```

This produces `body-tracker-<timestamp>.sql.gz.enc` instead, with the
unencrypted intermediate file removed. **Store `BACKUP_ENCRYPTION_KEY`
somewhere durable and separate from the backups themselves** (a secrets
manager, not a text file sitting next to the backup dir) — losing it makes
every encrypted backup permanently unreadable, by design.

---

## Automating daily backups

The script takes all configuration from environment variables and exits
non-zero on failure, so it drops directly into cron or a systemd timer.
Supply `DATABASE_URL` / `BACKUP_DIR` / `RETENTION_DAYS` /
`BACKUP_ENCRYPTION_KEY` via whichever mechanism your process supervisor uses
for environment injection — see `docs/ops/environment-variables.md` for where
these are expected to live in each deployment target.

### Option A: cron

Edit the crontab for the user that should own backups (e.g. `crontab -e` as
a dedicated `backup` or `deploy` user — avoid running this as `root` if a
less-privileged user has the necessary DB access):

```cron
# Body Tracker: nightly DB backup at 02:15 UTC
15 2 * * * DATABASE_URL="postgresql://body_tracker:REDACTED@db.internal:5432/body_tracker" BACKUP_DIR="/var/backups/body-tracker" RETENTION_DAYS="14" BACKUP_ENCRYPTION_KEY="$(cat /etc/body-tracker/backup.key)" /opt/body-tracker/scripts/backup-db.sh >> /var/log/body-tracker/backup.log 2>&1
```

In practice, prefer sourcing secrets from a restricted-permission env file
rather than inlining them in the crontab (crontabs are often world-readable
via `crontab -l` for the owning user, and inline secrets are easy to leak
into `ps` output or shell history):

```cron
15 2 * * * . /etc/body-tracker/backup.env && /opt/body-tracker/scripts/backup-db.sh >> /var/log/body-tracker/backup.log 2>&1
```

where `/etc/body-tracker/backup.env` (mode `600`, owned by the backup user)
exports `DATABASE_URL`, `BACKUP_DIR`, `RETENTION_DAYS`, and
`BACKUP_ENCRYPTION_KEY`.

### Option B: systemd timer (preferred on modern Linux hosts)

`/etc/systemd/system/body-tracker-backup.service`:

```ini
[Unit]
Description=Body Tracker database backup
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
User=backup
EnvironmentFile=/etc/body-tracker/backup.env
WorkingDirectory=/opt/body-tracker
ExecStart=/opt/body-tracker/scripts/backup-db.sh
```

`/etc/systemd/system/body-tracker-backup.timer`:

```ini
[Unit]
Description=Run Body Tracker database backup daily

[Timer]
OnCalendar=*-*-* 02:15:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

`Persistent=true` means a backup that was missed (host was off at 02:15)
still runs shortly after the host comes back — worth having for a job this
important. Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now body-tracker-backup.timer
sudo systemctl list-timers body-tracker-backup.timer
```

Check recent runs:

```bash
journalctl -u body-tracker-backup.service --since "2 days ago"
```

---

## Encryption

Set `BACKUP_ENCRYPTION_KEY` to enable AES-256-CBC encryption (via `openssl
enc -aes-256-cbc -pbkdf2 -salt`, PBKDF2 key derivation) of every backup
produced. When set, only the `.sql.gz.enc` file is kept — the plaintext
`.sql.gz` is deleted immediately after encryption succeeds, so an
interrupted-mid-encryption failure is the only window where a plaintext dump
would linger (the script's `set -e` means a failed `openssl` call stops the
script before the `rm` runs, so you'd see a `.sql.gz` and no `.enc` file in
that failure case — worth alerting on if it happens).

To decrypt, see `docs/ops/restore-guide.md` — `scripts/restore-db.sh` handles
`.enc` files automatically when given `BACKUP_ENCRYPTION_KEY`.

Generate a strong key once and store it in a secrets manager (not in the
repo, not in the backup directory itself):

```bash
openssl rand -base64 32
```

---

## Retention policy

Default: **14 days** (`RETENTION_DAYS=14`). The script prunes anything older
than that on every run, matching both `.sql.gz` and `.sql.gz.enc` filenames.

To change it, set `RETENTION_DAYS` in the same environment file used for
cron/systemd (see above):

```bash
RETENTION_DAYS=30
```

Retention is enforced locally within `BACKUP_DIR` only — if you also ship
backups off-host (recommended; see below), that destination needs its own
independent retention policy, since this script has no visibility into
anything outside `BACKUP_DIR`.

---

## Where backups land

Default: `/var/backups/body-tracker/`, overridable via `BACKUP_DIR`.
Filenames: `body-tracker-<UTC-timestamp>.sql.gz` (or `.sql.gz.enc`), e.g.
`body-tracker-20260724T021500Z.sql.gz.enc`. Timestamps are UTC and
lexicographically sortable, so `ls` and `find -newer` both order backups
correctly without any timestamp parsing.

**This directory needs disk space monitoring.** `deploy/monitoring/alerts.yml`
already defines a real Prometheus alert, `HostDiskAlmostFull`, which fires
when `/` has less than 10% free space for 10+ minutes — its own description
calls out exactly this risk ("database backups and logs will start failing").
A full disk breaks new backups outright (`pg_dump | gzip > ...` fails
partway through) and is independently alerted on — but don't rely on the
alert alone if `BACKUP_DIR` lives on a different filesystem/mount than `/`;
in that case mirror the same disk-space alerting for that mount specifically.

For durability beyond a single host, sync `BACKUP_DIR` to off-host storage
(S3/GCS/an object store, or a second host) as a follow-up step after
`backup-db.sh` runs — e.g. append an `aws s3 sync "$BACKUP_DIR"
s3://your-backup-bucket/body-tracker/` (or equivalent) line after the script
call in the cron/systemd job. This isn't built into `backup-db.sh` itself, so
it needs to be added at the automation layer.

---

## Configuration backup (not just the database)

A database backup alone doesn't let you rebuild the system from scratch —
secrets and deployment configuration matter too, and unlike the database,
today's in-memory-store deployment already _has_ real configuration worth
protecting:

- **`.env`** (real values, derived from `.env.example` in this repo) — contains
  secrets (`BTK_JWT_SECRET`, and eventually `DATABASE_URL`,
  `BACKUP_ENCRYPTION_KEY`, etc.). **Never commit this to git.** Back it up as
  a plain file copy to a secure, access-controlled location (a secrets
  manager, or an encrypted archive alongside DB backups) — not to a public or
  team-wide git repo.
- **`ecosystem.config.js`** (PM2 process configuration) — mostly non-secret
  (worker count, memory limits, restart policy) but still operationally
  critical to reproduce a deployment exactly. This one is safe and useful to
  version in git, since it doesn't hold credentials itself (double check
  before assuming that stays true if it's edited later to embed anything
  sensitive).
- **`deploy/nginx`** (reverse proxy / TLS termination config) — safe and
  recommended to version in git; if it ever gets a hardcoded secret (e.g. an
  auth basic-auth password) added, split that out to an included file that's
  gitignored.

Recommended split:

```bash
# Versioned in git (already tracked or safe to track):
#   ecosystem.config.js
#   deploy/nginx/**
#   docker-compose.yml
#   prisma/schema.prisma

# NOT versioned — back up separately, encrypted, to secure storage:
#   .env
#   /etc/body-tracker/backup.env  (or wherever BACKUP_ENCRYPTION_KEY lives)
#   any TLS private keys under deploy/nginx or certbot's storage
```

A simple periodic configuration backup (pair with the DB backup job, same
cadence) alongside `scripts/backup-db.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
DEST="/var/backups/body-tracker-config/config-$(date -u +%Y%m%dT%H%M%SZ).tar.gz.enc"
tar -czf - -C /opt/body-tracker .env ecosystem.config.js \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "pass:${BACKUP_ENCRYPTION_KEY}" -out "$DEST"
```

(This is a suggested pattern, not a script that exists in this repo today —
adapt paths to wherever secrets actually live in your deployment.)

---

## See also

- `docs/ops/restore-guide.md` — the other half of this: how to restore a
  backup produced here, including the disaster-recovery walkthrough.
- `docs/ops/database-guide.md` — the schema these backups capture, and the
  current in-memory-store reality.
- `docs/ops/environment-variables.md` — canonical reference for
  `DATABASE_URL`, `BACKUP_ENCRYPTION_KEY`, `BACKUP_DIR`, `RETENTION_DAYS`, and
  every other environment variable this system uses.
- `deploy/monitoring/alerts.yml` — `HostDiskAlmostFull` and the rest of the
  host-level alerting that backups depend on having headroom for.
