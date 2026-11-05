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

## Security scan (trivy 0.76.0, 2026-11-05)

- Findings are in dependencies that were already present (Electron 44.2.0 has
  CVEs with fixes in 44.9.1; `tar`, `decompress`, `form-data`,
  `@adonisjs/bodyparser`, `set-value`, `proxy-addr`). The `@ghostery/*` packages
  have no findings.
- Secrets: the JWT in `src/internal-server/app/Controllers/Http/UserController.js`
  is a masked placeholder (`'****'`), reported as a false positive.
- Dockerfile: `:latest` tag, root user, no `HEALTHCHECK`. Pre-existing.
- Not changed in this work. Electron upgrade needs its own plan.
