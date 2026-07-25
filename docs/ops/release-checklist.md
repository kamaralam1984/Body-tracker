# Release Checklist

Concrete, skippable steps for cutting a release of Body Tracker. Work top to bottom; don't skip a box because "it probably still passes."

## 1. Pre-flight on `main`

- [ ] `main` is up to date locally (`git fetch origin && git status`) and you're releasing from `main`, not a feature branch.
- [ ] All CI checks are green on the latest commit of `main` — check the `CI` workflow run in GitHub Actions (`.github/workflows/ci.yml`: lint, typecheck, build, integration tests, Docker build sanity check).
- [ ] No open PRs intended for this release are still unmerged.

## 2. Local static checks

Run these against a clean working tree:

```bash
npx tsc --noEmit
```

- [ ] Type check passes with zero errors.

```bash
npm run lint
```

- [ ] ESLint (`eslint-config-next`, flat config in `eslint.config.mjs`) passes with zero errors/warnings.

## 3. Production build

```bash
npm run build
```

- [ ] `npm run build` (Next.js 16 build, `output: "standalone"` per `next.config.ts`) completes successfully with **no warnings** in the output.
- [ ] Build was run with a real (non-default) `BTK_JWT_SECRET` set in the environment, matching how CI builds it — a build with the dev-default secret can mask a `getEnv()` fail-fast regression that would only surface in production. Example:
  ```bash
  BTK_JWT_SECRET=$(openssl rand -hex 32) npm run build
  ```

## 4. Run the real integration suite against the production build

Don't just trust `next dev` — start the actual built server and hit it for real:

```bash
# copy static/public assets into the standalone output, same as CI/deploy do
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# start the standalone production server
BTK_JWT_SECRET=$(openssl rand -hex 32) PORT=3045 node .next/standalone/server.js &

# wait for it to be up, then run the real 43-test suite against it
curl --retry 10 --retry-connrefused -f http://localhost:3045/api/v1/health
node scripts/api-tests.mjs
```

- [ ] All 43 tests in `node scripts/api-tests.mjs` pass against the freshly built **production** server (not the dev server).
- [ ] Stop the server afterward (`kill %1` or equivalent) — don't leave a stray process holding port 3045.

## 5. Manual smoke test of the API Explorer

Against the same fresh production build (server still running, or restarted):

- [ ] Open `http://localhost:3045/docs/api-explorer` and confirm it loads with no console errors.
- [ ] Confirm `http://localhost:3045/api/v1/openapi.json` returns a valid document (spot-check that recently changed domains' path fragments appear correctly).
- [ ] Log in via the Explorer (or `curl`) with a seeded demo account (`owner@apex-performance.dev` / `OwnerPass123!`, see `docs/ops/installation-guide.md`) and successfully call at least one authenticated endpoint (e.g. `GET /sessions`) through the Explorer UI.
- [ ] Confirm `GET /api/v1/health/ready` returns `{"ready":true,...}` with HTTP 200.

## 6. Version bump

- [ ] Bump `"version"` in `package.json` to the new semver (`X.Y.Z`), following the tag you're about to push.
- [ ] Commit the version bump on `main`:
  ```bash
  git add package.json
  git commit -m "chore: release vX.Y.Z"
  git push origin main
  ```
- [ ] Confirm CI is green again on this new commit before tagging.

## 7. Tag and push

```bash
git tag vX.Y.Z
git push --tags
```

- [ ] Tag pushed matches the `v*.*.*` pattern `.github/workflows/release.yml` listens for (`on.push.tags: ["v*.*.*"]`).
- [ ] `.github/workflows/release.yml`'s `Release` workflow triggered in GitHub Actions (check the Actions tab).

## 8. Verify the release workflow's output

The `Release` workflow (triggered above) builds and pushes a Docker image and drafts a GitHub Release with an auto-generated changelog. Verify each step actually landed:

- [ ] `Release` workflow run completed successfully (all steps green).
- [ ] New image tag exists in **GHCR** (GitHub Container Registry) at `ghcr.io/<org>/<repo>:X.Y.Z` — check the "Packages" tab on the repo, or:
  ```bash
  docker pull ghcr.io/<org>/<repo>:X.Y.Z
  ```
- [ ] `ghcr.io/<org>/<repo>:latest` was also updated (the workflow pushes both tags).
- [ ] A GitHub Release named `vX.Y.Z` was created (`softprops/action-gh-release`, `generate_release_notes: true`) with auto-generated release notes — review them for accuracy/readability, not just presence.

## 9. Docs and changelog

- [ ] If this release fixes a previously-documented known issue, update `docs/ops/troubleshooting-guide.md` to remove/resolve that entry.
- [ ] Update the in-app changelog (`src/app/docs/changelog/`) if user-facing behavior changed.
- [ ] If this release changes environment variables, deploy topology, or operational procedure, update the relevant `docs/ops/*.md` file(s) in the same PR that bumped the version, not after the fact.

## 10. Post-release sanity

- [ ] Pull the newly published image locally and confirm it starts and passes a basic health check:
  ```bash
  docker run --rm -p 3045:3000 -e BTK_JWT_SECRET=$(openssl rand -hex 32) ghcr.io/<org>/<repo>:X.Y.Z &
  curl --retry 10 --retry-connrefused -f http://localhost:3045/api/v1/health
  ```
- [ ] Note the release in whatever the team uses to track deploys (so `docs/ops/release-checklist.md`'s next run has an accurate "since last release" starting point).
