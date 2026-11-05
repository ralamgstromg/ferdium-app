# Ad blocker, YouTube ads and Google sign-in

Main-process code for these features lives in `src/electron/`.

## Ad and tracker blocker

- File: `src/electron/adBlocker.ts`. Engine: `@ghostery/adblocker-electron`
  (2.20.3), built with `ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)`.
- Lists are downloaded at each start. The serialized engine is cached in
  `userData/adblocker-engine.bin` and used if the download fails.
- Ferdium exception rules (sign-in hosts and Google account hosts) are added
  with `updateFromDiff`. `merge` is not used because the resource checksums of
  the two engines differ.
- Requests wait for the engine, up to `ENGINE_WAIT_MS` (15 s). After that they
  pass unfiltered, so a stalled download cannot freeze pages.
- There is no reload of services after the sync. A reload aborted loads still
  in progress (`ERR_ABORTED` on Telegram and YouTube Music).
- Renderer side: `src/features/adBlocker/index.ts` sends `set-service-adblock`
  for each service.

## YouTube and YouTube Music

- Scriptlet rules are in `YOUTUBE_RULES` (`src/electron/adBlocker.ts`). They
  remove ad fields from the player response. The lists only cover
  `www.youtube.com`, so YouTube Music has its own copies.
- Page script: `src/electron/youtubeAds.ts`. While `#movie_player` has
  `ad-showing`, it clicks the skip buttons, mutes the ad, and seeks to its end.
  It restores the sound only if it muted the video.
- Limits: ads inside the video stream and site changes are not covered.

## Google sign-in from popups

- Google rejects sign-in from embedded browsers that send an Electron user agent
  or a versioned Chrome token. The chromeless user agent is `chromelessUserAgent()`
  (`src/helpers/userAgent-helpers.ts`): the version is removed from `Chrome/x.y`.
- Popups opened with `window.open` are handled in `src/index.ts`:
  - `did-create-window`: if the popup URL is a Google sign-in page, the
    chromeless user agent is set and the page is loaded again.
  - `will-navigate` on the popup: if it navigates to Google and the popup has
    not the chromeless user agent yet, the navigation is prevented, the user
    agent is set, and the page is loaded again. This covers popups that start
    on `about:blank`.
- `isGoogleSignInUrl(url)` compares the parsed protocol and host exactly.
  A prefix match would also accept `accounts.google.com.example.test`.
- Not verified in the running app: sign-in with a Google account on claude.ai.

## Tests

- `test/electron/adBlocker.test.ts`: blocking, exceptions, deferred requests,
  cache fallback, YouTube rules, and the YouTube page script.
- `test/helpers/userAgent-helpers.test.ts`: `isGoogleSignInUrl`.

## Security scan and dependency remediation (2026-11-05)

Full report: [SECURITY_AUDIT.md](SECURITY_AUDIT.md). Summary:

- Upgraded `electron` to 44.10.2 (certificate and frame geometry CVEs),
  `fast-folder-size` to 2.4.2 (removes `decompress`), `tar` to 7.5.22,
  `sqlite3` to 5.1.7, `simple-git` to 4.0.2, `react-router-dom` to 7.18.2,
  and `darkreader` to 4.9.117.
- Non-breaking transitive fixes via `pnpm-workspace.yaml` overrides, limited to
  patches inside the same major version.
- Removed the tracked `package-lock.json` (npm, stale; pnpm is the package
  manager).
- Correction: an earlier version of this section said critical findings were
  reduced to 0 and that the internal server JWT was masked. Both were wrong.
  The `@adonisjs/bodyparser` override forced a major-version jump that broke
  the internal server at boot, and the JWT literal in
  `src/internal-server/app/Controllers/Http/UserController.js` is not masked.
- The internal server moved from AdonisJS 5 to AdonisJS 7, which closes the
  bodyparser and lucid CRITICAL/HIGH advisories. The server is documented in
  `docs/INTERNAL_SERVER.md`. Remaining advisories are listed in
  SECURITY_AUDIT.md.
- `uuid` is now 11.1.1 (moderate advisory fixed).
- Dockerfile: the final stage runs as root (trivy DS-0002). Not changed: the
  documented export flow in CONTRIBUTING.md writes to a host volume, which a
  non-root user cannot do.

## WebAuthn page script on sign-in pages

- The WebAuthn page script (`electron-webauthn-linux`) adds a "Google Chrome"
  brand to `navigator.userAgentData` and forces
  `isUserVerifyingPlatformAuthenticatorAvailable` to `true`. The Sec-CH-UA
  request headers do not carry that brand, so the page sees two browsers.
- `shouldInjectWebAuthnPageScript(hostname)` skips the script on
  `accounts.google.com` and `claude.ai`. It is used in the recipe preload
  (`src/webview/recipe.ts`) and the popup preload
  (`src/webview/webauthn-popup-preload.ts`).
- `src/electron/requestHeaders.ts` keeps one `onBeforeSendHeaders` listener per
  service session and applies every rule to it. Electron allows only one
  listener per event and session. Recipe headers (`modifyRequestHeaders`) use
  the same registry.
- Not verified in the running app: the Google sign-in from `claude.ai`.

## Popup preload (sandboxed)

- The popup preload (`src/webview/webauthn-popup-preload.ts`) runs in a
  sandbox. A sandboxed preload cannot `require` the package or local modules,
  so it failed with `module not found: electron-webauthn-linux` and no popup
  had the WebAuthn bridge.
- The main process passes the page script and the skipped hosts as
  `additionalArguments` (`--ferdium-webauthn-script=`,
  `--ferdium-webauthn-skip=`) when it creates the popup. The preload reads them
  from `process.argv`.
- A synchronous IPC call (`ipcRenderer.sendSync`) in the preload made Google
  navigations fail with `ERR_FAILED`, so it is not used.
- Verified with Electron, sandbox on: a local page gets the script and
  `electronWebAuthn`; `accounts.google.com` gets neither and loads normally.
- Not verified in the running app: the Google sign-in from `claude.ai`.

## Google sign-in opens in the system browser

- Embedded Google sign-in is rejected by Google's server: the identifier step
  (`batchexecute` `MI613e`) redirects to `/v3/signin/rejected` after the
  `browserinfo` check. No app-side change (user agent, headers, preloads,
  popup options) avoided it.
- `setWindowOpenHandler` (`src/index.ts`) sends Google sign-in URLs
  (`isGoogleSignInUrl`) to `openExternalUrl` and denies the popup.
- A popup that starts on `about:blank` and navigates to Google is closed and
  its URL is opened in the system browser (`will-navigate` in `did-create-window`).
- Trade-off: the sign-in completes in the system browser. The Claude session
  is not created inside Ferdium.
- Removed: the chromeless user agent for Google popups and the popup
  diagnostics.
