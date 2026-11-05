# Security audit: 2026-11-05

Scope: production dependencies (`pnpm audit --prod`), trivy (vuln, secret,
misconfig) on the repo, and the internal server.

## Tools and sources

- `pnpm audit --prod` reads `pnpm-lock.yaml` (the source of truth).
- trivy reads all lockfiles and the Dockerfile. Its advisory database differs
  from pnpm's, so the two lists are not identical.

## Result

| Source                  | Start of work                     | Now                           |
| ----------------------- | --------------------------------- | ----------------------------- |
| `pnpm audit --prod`     | 37 (1 high, 26 moderate, 10 low)  | 6 (1 high, 2 moderate, 3 low) |
| trivy on `pnpm-lock`    | 1 high (`ip`)                     | 1 high (`ip`)                 |
| trivy on `package-lock` | many critical/high (file removed) | not present                   |

Critical findings: 0 in both tools. The remaining items have no upstream fix,
or only a fix in a new major version of a build-time tool (see below).

## Changes

| Item                              | Change                                                                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stale npm lockfile                | `package-lock.json` removed and added to `.gitignore`. It produced most trivy CRITICAL/HIGH results and is not used by pnpm or the Dockerfile.                                                                 |
| react-router (4 moderate, 1 high) | `react-router-dom` 6.24.1 to 7.18.2. Only `Outlet`, `Link`, `NavLink`, `useParams`, and `Params` are used (24 files).                                                                                          |
| darkreader (low)                  | 4.9.96 to 4.9.117.                                                                                                                                                                                             |
| uuid (moderate, direct)           | 9.0.1 to 11.1.1. Only `v4` is used.                                                                                                                                                                            |
| Transitive, same-major fixes      | Overrides in `pnpm-workspace.yaml` for `@babel/*`, `@octokit/request`, `@octokit/request-error`, `@sentry/browser`, `ajv`, `cookie`, `moment`, `qs`, `send`, `serve-static`, `tough-cookie`, `xml2js`, `yaml`. |
| Internal server (AdonisJS 5)      | Migrated to AdonisJS 7. Removes the bodyparser and lucid CRITICAL/HIGH advisories and the `edge.js` moderate one. See `docs/INTERNAL_SERVER.md`.                                                               |

## Regression found and reverted

Commit `5dbd2bb2` added overrides `'@adonisjs/bodyparser@<=10.1.2': ^10.1.3`
and `'@adonisjs/lucid@<=21.8.1': ^21.8.2`. They crossed majors: bodyparser
2.3.0 became 10.1.6 and lucid 6.3.0 became 21.8.2. The AdonisJS 5 server then
failed at boot with:

```
Error: Package subpath './providers/BodyParserProvider' is not defined by "exports"
```

The overrides were removed. An `edge.js@<5.3.2` override had the same problem
(`edge.js` 1.1.4 became 5.5.1, and the view code failed with
`edge.configure is not a function`), so it was removed too. The lesson is kept
in the project memory: do not override across a major version.

The fix for this was the server migration below, not the overrides.

## Internal server migration (AdonisJS 5 to 7)

Done on branch `chore/internal-server-adonis-7`. Behaviour kept:

- Every route, method, and response shape from the AdonisJS 5 server. The
  one exception is listed under "Behaviour changes".
- The database file and its schema. The template database already lists the
  four migrations, so the migration does not change the schema.
- The token guards. Same three guards (API header, query string, cookie).

Verified:

- `test/internal-server/server.test.ts` (8 tests): health, token rejection,
  current user, service create/list/delete, workspace create, browser cookie,
  Edge pages with their layout, static CSS. Runs the real server in a child
  Node process with Electron modules stubbed.
- The same run under Electron's embedded Node runtime (`ELECTRON_RUN_AS_NODE`).
- Legacy database test: a copy of the template with rows written in the old
  format is read correctly. The startup wizard only updates `db_version`.
  `adonis_schema` is unchanged.
- Icon upload through multipart (`PUT /v1/service/:id` with `icon`) and the
  icon read back with the token in the query string.
- Bundled app (`node esbuild.mjs`) started in Electron for 45 s with no main
  process exceptions. The only errors were the Wayland/GTK messages of this
  environment and Chromium shutdown messages when the timeout stopped the app.

Not verified: the local server started from the renderer (IPC
`startLocalServer`) inside the running app. The server code path is the same
one the test runs.

Behaviour changes (intentional):

- Token check: `/token/:token` used to set the browser cookie for any value,
  because the check was not awaited. It now sets the cookie only for the
  session token. `timingSafeEqual` also threw (HTTP 500) when the token length
  differed. Both fixed.
- `GET /v1/recipes/download/:recipe`: the old `accepted` validation rule always
  rejected a recipe name, so the endpoint never returned a package. It now
  returns the package when it exists in the recipes folder.
- Startup: the migration wizard now runs before the server listens. A failure
  stops startup instead of being an unhandled rejection.
- Errors from the upstream API (`apiRequest` in the user controller) now reject
  and produce HTTP 401. The old helper could leave the request pending forever.
- Error bodies use AdonisJS 7's default format, not the old custom handler.
  The Ferdium client only checks the status code.

## Open risks (accepted, need a decision or an upstream fix)

| Package                                 | Severity | Status                                                                                             |
| --------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `ip` 2.0.0                              | HIGH     | SSRF in `isPublic`. No patched version. Reached only through `sqlite3 > node-gyp` (build tooling). |
| `glob` (via `macos-notification-state`) | moderate | Fix is in glob 14, a major version change in build tooling (`node-gyp`). Not shipped at runtime.   |
| `minimatch` (same chain)                | moderate | Fix is in minimatch 11. Same chain.                                                                |
| `@tootallnate/once` (via `sqlite3`)     | low      | Fix is in 2.x. Build tooling.                                                                      |
| `deepmerge` (via `@sentry/electron`)    | low      | No patched version.                                                                                |

## Secrets

trivy flags `src/internal-server/app/Controllers/Http/UserController.js`
(`LOGIN_SUCCESS_TOKEN`). The value is a complete JWT literal, not a masked
placeholder as an earlier note said. It is returned only by the local server's
login route, which is token-gated and bound to `localhost`. It is not a
production credential. Replacing it with a generated value would close the
finding.

## Dockerfile

trivy DS-0002: the final `busybox` stage runs as root. Not changed.
`CONTRIBUTING.md` documents extracting artifacts with `mv` into a host volume
(`-v ~/Downloads/...:/ferdium-out`). A non-root user cannot write there, so
setting `USER` would break the documented flow. If you want it, the export
step needs to change first.
