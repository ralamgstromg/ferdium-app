<p align="center">
    <img src="../src/internal-server/public/images/logo.png" alt="" width="300"/>
</p>

# ferdium-internal-server

Internal Ferdium Server used for storing settings/preferences without logging into an external server.

## Differences to ferdium-server

- Doesn't contain user management (only one user)
- Doesn't require logging in
- No recipe creation
- Contains `start.ts`, which boots the server (`server(userPath, port, token)`) from the Electron main process
- Only allows Ferdium clients to connect to the API

## Stack

AdonisJS 7 (`@adonisjs/core` 7, `@adonisjs/lucid` 22, `@adonisjs/bodyparser` 11, `edge.js` 6, `@vinejs/vine` 4). Earlier versions used AdonisJS 5 (`env.ini`, `use()` globals, `validateAll`); see `docs/SECURITY_AUDIT.md` for why it was migrated.

- `start.ts`: boots the server with `IgnitorFactory`. Configuration is in code, not in a `config/` folder, so the Electron build does not need extra files.
- `start/kernel.js`: global middleware (body parser, empty strings to null, static files).
- `start/routes.js`: all routes and the token guards.
- `start/migrate.js`: the startup wizard that marks the database with the Ferdium version.
- `app/Controllers/Http/*.js`: controllers. `app/Database.js` gives access to the Lucid query builder; `app/Validation.js` wraps VineJS.
- `database/template.sqlite`: copied for each new user. Its `adonis_schema` table already lists the four migrations, so nothing runs migrations at startup.

Running the server outside Electron (for example in tests) needs Node 22.12 or later, because the Adonis packages are ESM and load through `require()`. Electron 44 is built on Node 24.

## Configuration

The server reads these environment variables. The Electron main process sets the first five; `CONNECT_WITH_FRANZ` has a default:

- `DB_PATH`, `USER_PATH`, `HOST`, `PORT`, `FERDIUM_LOCAL_TOKEN`: set by `start.ts` for each run.
- `CONNECT_WITH_FRANZ` (`true` or `false`, default: `true`, set by `start.ts` if unset): Whether to enable connections to the Franz server. By enabling this option, `ferdium-internal-server` can:
  - Show the full Franz/Ferdi recipe library instead of only custom recipes
  - Import Franz/Ferdi accounts

## Exporting backups

Since the `ferdium-internal-server` runs a local server, there's no automatic syncing of settings possible. You can backup your settings, by clicking on `Help > Import/Export Configuration Data` which will open the running server page in your browser. Choose the option to export and save the generated file.

## Importing your Franz/Ferdi account

`ferdium-internal-server` allows you to import your full Franz account, including all its settings.

To import your Franz/Ferdi account, within Ferdium, click on `Help > Import/Export Configuration Data` which will open the running server page in your browser. You can then login using your Franz account details. `ferdium-internal-server` will create a new user with the same credentials and copy your Franz settings, services and workspaces.
