# Artifact leaderboards

Optional backend for standalone Portal artifacts. The first game is Cosmic Carnival
(scoring version `1`). API and static host deploy independently from this repository.
Portal owns login and profile identity; this service owns only game sessions and runs.

## Architecture

The static Caddy host proxies `/leaderboard-api/cosmic-carnival/*` to this service's
HTTPS Railway domain using `LEADERBOARD_UPSTREAM`. This keeps cookies first-party
without cross-project database access or changes to the artifacts CSP. Portal's
callback URL points to this **proxied artifacts URL**, not the API service domain.

Deploy the API in RaidGuild Playground beside Tapper-Postgres. Use the dedicated
`artifact_leaderboards` schema and a restricted login role with table CRUD and
sequence usage, but no access to other games' tables. Never grant it Portal DB access.
The schema migration is an administrative deploy step; the runtime role cannot DDL.

## Configuration

- `DATABASE_URL`: private connection to Tapper-Postgres using the restricted role.
- `ARTIFACT_ORIGIN`: `https://portal-artifacts-production.up.railway.app` (no trailing slash).
- `PORTAL_ISSUER`: `https://portal.raidguild.org` (must exactly match launch issuer).
- `COSMIC_LAUNCH_SECRET`: unique random secret, at least 32 characters. Same value as
  `COSMIC_CARNIVAL_LAUNCH_SECRET` on Portal; not the global Portal launch secret.
- `PORT`: Railway listen port, default 8080.
- `NODE_ENV=development`: local HTTP cookies only; never use in production.

Portal module configuration is in `ops/configure-portal.ts`. It is dry-run by default
and applies only with `--apply`, from a Portal checkout with its Payload CLI. It
changes auth fields on the existing module, leaves visibility and entry URL intact,
and checks the expected slug, kind and entry URL before updating.

## Deploy

1. With administrator database credentials, run `npm run migrate`; grant the runtime
   role schema usage, table SELECT/INSERT/UPDATE/DELETE, sequence USAGE/SELECT.
2. Deploy `services/leaderboards/` as the Railway service root using its Dockerfile
   and set its Railway service health check to `/health` (60-second timeout). Set the configuration above. `/health` checks schema reachability.
3. Set `LEADERBOARD_UPSTREAM=https://<api-service-domain>` on the static artifacts
   service and deploy the repository root with its existing Dockerfile.
4. Set the dedicated launch secret in Portal and redeploy it to load the value.
5. Run the Portal configuration script in dry-run, then with `--apply`.

For CLI deployments use `railway up services/leaderboards --path-as-root` with
explicit project and service selectors. For GitHub autodeploy, set the service root
to `/services/leaderboards`. Configure deployment settings directly in Railway; new `railway.json` configuration is deprecated by Railway. After review, switch the service branch from `codex/cosmic-leaderboards` to `main`.
Do not deploy the static root Dockerfile to the API service.

## API

All routes below are beneath `/leaderboard-api/cosmic-carnival`:

- `GET /callback?token=...`: verifies HS256, issuer, audience, type, game, subject,
  expiry and age; atomically consumes `jti`, sets a 12-hour HttpOnly/Secure/Lax cookie,
  redirects to clean game URL. Failed launches return to guest play.
- `GET /session`: display name and scoring version; 401 for guests.
- `GET /leaderboard`: top 20, one best run per player; earlier submission breaks ties.
- `POST /runs`: `{version:"1"}`; server-issued run ID, maximum 60 starts/player/hour.
- `POST /runs/:id/finish`: `{version:"1",score,wave,durationMs}`; belongs to the same
  session, maximum two-hour lifetime, exact retries idempotent, changed repeats rejected.
- `POST /logout`: revokes the session and clears its cookie.

Writes require the exact artifacts Origin plus JSON. User IDs and display names in
submission bodies are never trusted. Stored identity is `(issuer, sub)`. Public
responses contain only display names, scores and waves. JWTs and database URLs must
never be logged; do not enable access logging of callback query strings.

Guest play and local bests survive API failures. Sandboxed embeds are guest-only;
ranked play opens the standalone module through Portal. Scripts served on the same
artifacts origin share a trust boundary: the game cookie authorizes only this game,
not Portal or other applications. Sessions are not isolated from other same-origin
artifact scripts. Use a dedicated game origin if that stronger isolation becomes needed.

## Validation limits

This is a casual, client-reported leaderboard. Checks reject negative/fractional
scores, wrong versions, scores above the generated wave schedule maximum, impossible wave/duration combinations, expired
runs, other sessions' runs, and duplicate changes. They do not prevent fabricated
plausible scores or bots. Replay validation is a later improvement. Scoring changes
must increment VERSION in backend and client to start a separate leaderboard.

## Development / verification

Node 22+. `npm ci`. Run local Postgres, then:

```
DATABASE_URL=postgresql://... npm run migrate
TEST_DATABASE_URL=postgresql://... npm test
```

Tests require a disposable local database named `*_test` and reset their schema; they create test players and
runs. Never point them at production. API tests cover auth, replay, CSRF, ownership,
concurrent retries, rankings, run expiry and per-player limits. Also run the game's
simulation tests and production build in `studies/cosmic-carnival/`.

Local integration uses Caddy at localhost:8097 proxying this API at localhost:8098,
`ARTIFACT_ORIGIN=http://localhost:8097`, a synthetic test issuer/secret, and development
cookies. Test a complete signed-launch → game-over → leaderboard flow, guest play,
API failure, and mobile layout.

## Rollback

Set the module back to `authMode: none` to return to guest-only launch. Revert the
static deployment or unset LEADERBOARD_UPSTREAM; guest gameplay continues. Keep the
schema and scores intact. No existing game tables are changed by this service.

Wave rules are generated from the game source by `npm run build` in `studies/cosmic-carnival`. Commit the generated `src/cosmic-waves.js` alongside changes to the scoring version.
