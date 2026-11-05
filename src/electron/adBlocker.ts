import { readFile, writeFile } from 'node:fs/promises';
import { ElectronBlocker } from '@ghostery/adblocker-electron';
import { Notification, type WebContents, ipcMain, session } from 'electron';
import { userDataPath } from '../environment-remote';
import {
  AD_PLACEHOLDER_CLEANUP_SCRIPT,
  OUTLOOK_HOSTS,
} from './adPlaceholderCleanup';
import { YOUTUBE_AD_SKIP_SCRIPT, YOUTUBE_HOSTS } from './youtubeAds';

const debug = require('../preload-safe-debug')('Ferdium:adBlocker');

const PRELOAD_PATH = require.resolve('@ghostery/adblocker-electron-preload');

const CACHE_PATH = userDataPath('adblocker-engine.bin');

// How long a request or cosmetic query waits for the lists. After that it goes
// through unfiltered, so a stalled download cannot freeze a page.
const ENGINE_WAIT_MS = 15_000;

// Sign-in pages of identity providers verify the browser with scripts and
// telemetry calls that the filter lists also contain; filtering them makes the
// provider reject the login ("this browser may not be secure").
const AUTH_PAGE_HOSTS = [
  'accounts.google.com',
  'accounts.youtube.com',
  'login.live.com',
  'login.microsoftonline.com',
  'appleid.apple.com',
  'idmsa.apple.com',
];

// Hosts that appear in the lists but are used by the Google account UI and
// sign-in checks; answering them with empty responses makes Google flag the
// session as an unsupported or suspicious browser.
const NEVER_BLOCK_HOSTS = [
  'clientmetrics-pa.googleapis.com',
  'ogads-pa.googleapis.com',
  'ogads-pa.clients6.google.com',
  'csi.gstatic.com',
  'smartlock.google.com',
];

// Exception rules win over any block rule, whatever list they come from.
const EXCEPTION_RULES = [
  `@@||*$domain=${AUTH_PAGE_HOSTS.join('|')}`,
  ...NEVER_BLOCK_HOSTS.map(host => `@@||${host}^`),
];

// YouTube serves ads inside the player response JSON, which network rules do
// not match. json-prune removes those fields before the page reads them. The
// lists only carry the fetch-level rules for www.youtube.com, so YouTube Music
// gets its own copies (same scriptlets as the lists' www rules).
const YOUTUBE_RULES = [
  'youtube.com##+js(json-prune, playerResponse.adPlacements playerResponse.playerAds adPlacements playerAds)',
  'music.youtube.com##+js(trusted-replace-fetch-response, "adPlacements", "no_ads", player?)',
  'music.youtube.com##+js(trusted-replace-fetch-response, "adSlots", "no_ads", /^\\W+$/)',
  'music.youtube.com##+js(json-prune-fetch-response, playerAds adPlacements adSlots no_ads playerResponse.playerAds playerResponse.adPlacements playerResponse.adSlots playerResponse.no_ads, , propsToMatch, /player\\?|get_watch|^\\W+$/)',
];

// Ghostery downloads its maintained ads and tracking lists (EasyList,
// EasyPrivacy, uBlock Origin filters) on each start. The download is
// all-or-nothing, so if it fails the last serialized engine is used instead.
const loadBlocker = async (): Promise<ElectronBlocker | undefined> => {
  try {
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    // Serialized before Ferdium's own rules are added, so they are not stored twice.
    await writeFile(CACHE_PATH, blocker.serialize());
    debug(
      `Ad blocker lists synced: ${blocker.getFilters().networkFilters.length} records`,
    );
    if (Notification.isSupported()) {
      new Notification({
        title: 'Ad and tracker blocker',
        body: 'Filter lists synced successfully.',
        silent: true,
      }).show();
    }
    return blocker;
  } catch (error) {
    debug('Could not refresh ad blocker lists', error);
  }
  try {
    return ElectronBlocker.deserialize(await readFile(CACHE_PATH));
  } catch (error) {
    debug('Could not load ad blocker engine', error);
    return undefined;
  }
};

// The engine is shared by every service session. It is loaded once per app
// start; `engine` stays undefined if neither the lists nor the cache load.
let engine: ElectronBlocker | undefined;
let engineReady: Promise<void> | undefined;

const startEngine = (): Promise<void> => {
  if (!engineReady) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>(resolve => {
      timer = setTimeout(resolve, ENGINE_WAIT_MS);
    });
    const load = loadBlocker().then(loaded => {
      loaded?.updateFromDiff({
        added: [...EXCEPTION_RULES, ...YOUTUBE_RULES],
      });
      engine = loaded;
    });
    engineReady = Promise.race([load, timeout])
      .catch(error => debug('Could not start ad blocker engine', error))
      .finally(() => clearTimeout(timer));
  }
  return engineReady;
};

// Cosmetic filtering needs two IPC channels that the library registers per
// session. Electron allows one handler per channel, and disabling a session
// would remove them for every service, so they are registered once, globally.
let cosmeticHandlersRegistered = false;

const registerCosmeticHandlers = () => {
  if (cosmeticHandlersRegistered) {
    return;
  }
  cosmeticHandlersRegistered = true;
  ipcMain.handle(
    '@ghostery/adblocker/inject-cosmetic-filters',
    async (...args: Parameters<ElectronBlocker['onInjectCosmeticFilters']>) => {
      await startEngine();
      return engine?.onInjectCosmeticFilters(...args);
    },
  );
  ipcMain.handle(
    '@ghostery/adblocker/is-mutation-observer-enabled',
    async event => {
      await startEngine();
      return (await engine?.onIsMutationObserverEnabled(event)) ?? false;
    },
  );
};

// Requests wait for the lists instead of passing unfiltered, so a page loaded
// at startup is filtered without being reloaded (a reload aborted loads that
// were still in progress).
const onBeforeRequest = (
  details: Electron.OnBeforeRequestListenerDetails,
  callback: (response: Electron.CallbackResponse) => void,
) => {
  startEngine()
    .then(() =>
      engine ? engine.onBeforeRequest(details, callback) : callback({}),
    )
    .catch(error => {
      debug('Ad blocker could not filter a request', error);
      callback({});
    });
};

// Sessions with blocking active, mapped to their preload script id.
const blockingSessions = new WeakMap<Electron.Session, string>();

const enableInSession = (ses: Electron.Session) => {
  if (blockingSessions.has(ses)) {
    return;
  }
  const preloadId = ses.registerPreloadScript({
    type: 'frame',
    filePath: PRELOAD_PATH,
  });
  ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, onBeforeRequest);
  blockingSessions.set(ses, preloadId);
};

const disableInSession = (ses: Electron.Session) => {
  const preloadId = blockingSessions.get(ses);
  if (preloadId === undefined) {
    return;
  }
  // Electron keeps one listener per event and session, so clearing them only
  // affects this service.
  ses.webRequest.onBeforeRequest(null);
  ses.unregisterPreloadScript(preloadId);
  blockingSessions.delete(ses);
};

export const setServiceAdBlock = (
  serviceId: string,
  enabled: boolean,
): void => {
  const serviceSession = session.fromPartition(`persist:service-${serviceId}`);

  if (!enabled) {
    disableInSession(serviceSession);
    return;
  }
  registerCosmeticHandlers();
  startEngine();
  enableInSession(serviceSession);
};

// Page scripts for sites whose ads the lists cannot remove: hides Outlook's
// in-page ad placeholders and skips YouTube video ads, for services with blocking.
export const watchAdPlaceholders = (contents: WebContents): void => {
  contents.on('dom-ready', () => {
    if (!blockingSessions.has(contents.session)) {
      return;
    }
    let hostname = '';
    try {
      hostname = new URL(contents.getURL()).hostname;
    } catch {
      return;
    }
    if (OUTLOOK_HOSTS.test(hostname)) {
      contents
        .executeJavaScript(AD_PLACEHOLDER_CLEANUP_SCRIPT)
        .catch(error => debug('Ad placeholder cleanup failed', error));
    }
    if (YOUTUBE_HOSTS.test(hostname)) {
      contents
        .executeJavaScript(YOUTUBE_AD_SKIP_SCRIPT)
        .catch(error => debug('YouTube ad skip failed', error));
    }
  });
};
