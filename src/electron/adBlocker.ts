import { readFile, writeFile } from 'node:fs/promises';
import { Notification, type WebContents, session } from 'electron';
import { userDataPath } from '../environment-remote';
import {
  AD_PLACEHOLDER_CLEANUP_SCRIPT,
  OUTLOOK_HOSTS,
} from './adPlaceholderCleanup';

const debug = require('../preload-safe-debug')('Ferdium:adBlocker');

const sessionsWithBlocking = new WeakSet<Electron.Session>();

let blockedHostsPromise: Promise<Set<string> | undefined> | undefined;

const CACHE_PATH = userDataPath('adblocker-hosts.txt');

// Public ad/tracker domain lists (hosts and AdGuard `||domain^` formats).
const HOST_LISTS = [
  'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext',
  'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts',
  'https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt',
  'https://adaway.org/hosts.txt',
  'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/hosts/pro.txt',
  'https://raw.githubusercontent.com/crazy-max/WindowsSpyBlocker/master/data/hosts/spy.txt',
  'https://big.oisd.nl/domainswild2',
  'https://o0.pages.dev/Lite/hosts.txt',
  'https://raw.githubusercontent.com/anudeepND/blacklist/master/adservers.txt',
  'https://s3.amazonaws.com/lists.disconnect.me/simple_ad.txt',
  'https://s3.amazonaws.com/lists.disconnect.me/simple_tracking.txt',
  'https://s3.amazonaws.com/lists.disconnect.me/simple_malvertising.txt',
  'https://easylist.to/easylist/easylist.txt',
  'https://easylist.to/easylist/easyprivacy.txt',
  'https://easylist-downloads.adblockplus.org/easylistspanish.txt',
];

const HOSTNAME = /^[\da-z]([\d.a-z-]*[\da-z])?$/;

// `||host^` rules, optionally limited to third-party requests, which block a
// whole domain. Rules with paths or other options need a full filter engine.
const ABP_DOMAIN_RULE = /^\|\|([^$*/^|]+)\^(?:\$(?:third-party|3p|all))?$/;

// Extracts the blocked hostname from one list line, if it has one:
// `0.0.0.0 host`, `127.0.0.1 host`, `||host^` or a bare `host`.
const parseLine = (rawLine: string): string | undefined => {
  // Only whole-line or space-preceded `#` starts a comment; `host##.ad` is a
  // cosmetic rule and must not turn into a blocked host.
  const line = rawLine
    .replace(/(^|\s)#.*$/, '')
    .trim()
    .toLowerCase();
  const candidate = line.startsWith('||')
    ? ABP_DOMAIN_RULE.exec(line)?.[1]
    : line.split(/\s+/).pop();
  return candidate?.includes('.') &&
    candidate !== 'localhost.localdomain' &&
    HOSTNAME.test(candidate)
    ? candidate
    : undefined;
};

const parseLists = (lists: string[]): Set<string> => {
  const hosts = new Set<string>();
  for (const list of lists) {
    for (const line of list.split('\n')) {
      const host = parseLine(line);
      if (host) {
        hosts.add(host);
      }
    }
  }
  return hosts;
};

const fetchList = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    // A list that cannot be fetched is skipped instead of failing the sync.
    debug('Skipping filter list', url, error);
    return '';
  }
};

const notifySyncSuccess = (count: number) => {
  debug(`Ad blocker lists synced: ${count} records`);
  if (Notification.isSupported()) {
    new Notification({
      title: 'Ad and tracker blocker',
      body: `Filter lists synced successfully: ${count.toLocaleString()} records.`,
      silent: true,
    }).show();
  }
};

const syncHosts = async (): Promise<Set<string>> => {
  const hosts = parseLists(
    await Promise.all(HOST_LISTS.map(url => fetchList(url))),
  );
  if (hosts.size === 0) {
    throw new Error('No filter list could be downloaded');
  }
  await writeFile(CACHE_PATH, [...hosts].join('\n'));
  notifySyncSuccess(hosts.size);
  return hosts;
};

const readCachedHosts = async (): Promise<Set<string>> => {
  const content = await readFile(CACHE_PATH, 'utf8');
  return new Set(content.split('\n'));
};

// The blocklist is shared by every service session and is rebuilt from the
// public lists on every app start; if that fails the last cache is used.
const loadBlockedHosts = async (): Promise<Set<string> | undefined> => {
  try {
    return await syncHosts();
  } catch (error) {
    debug('Could not refresh ad blocker lists', error);
  }
  try {
    return await readCachedHosts();
  } catch (error) {
    // Degrade to "no blocking" and retry on the next request.
    debug('Could not load ad blocker lists', error);
    blockedHostsPromise = undefined;
    return undefined;
  }
};

// Empty but valid responses per resource type. Types that cannot be answered
// meaningfully (pings, media, websockets, ...) are cancelled instead.
const STUB_RESPONSES: Record<string, string> = {
  script: 'data:text/javascript,',
  stylesheet: 'data:text/css,',
  image:
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  subFrame: 'data:text/html,',
  xhr: 'data:application/json,{}',
  other: 'data:text/plain,',
};

// Sign-in pages of identity providers verify the browser with scripts and
// telemetry calls that the lists also contain; filtering them makes the
// provider reject the login ("this browser may not be secure").
const AUTH_PAGE_HOSTS = new Set([
  'accounts.google.com',
  'accounts.youtube.com',
  'login.live.com',
  'login.microsoftonline.com',
  'appleid.apple.com',
  'idmsa.apple.com',
]);

const isAuthPage = (url: string): boolean => {
  try {
    return AUTH_PAGE_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
};

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

const isBlocked = (hosts: Set<string>, url: string): boolean => {
  let hostname: string;
  try {
    ({ hostname } = new URL(url));
  } catch {
    return false;
  }
  // Match the host and every parent domain (a.b.example.com -> example.com).
  const labels = hostname.toLowerCase().split('.');
  for (let i = 0; i < labels.length - 1; i += 1) {
    if (hosts.has(labels.slice(i).join('.'))) {
      return true;
    }
  }
  return false;
};

export const setServiceAdBlock = async (
  serviceId: string,
  enabled: boolean,
): Promise<void> => {
  const serviceSession = session.fromPartition(`persist:service-${serviceId}`);

  if (!enabled) {
    sessionsWithBlocking.delete(serviceSession);
    serviceSession.webRequest.onBeforeRequest(null);
    return;
  }
  sessionsWithBlocking.add(serviceSession);

  blockedHostsPromise ??= loadBlockedHosts();
  const hosts = await blockedHostsPromise;
  if (!hosts) {
    return;
  }
  for (const host of NEVER_BLOCK_HOSTS) {
    hosts.delete(host);
  }
  serviceSession.webRequest.onBeforeRequest(
    { urls: ['<all_urls>'] },
    (details, callback) => {
      if (
        details.resourceType === 'mainFrame' ||
        isAuthPage(details.referrer) ||
        !isBlocked(hosts, details.url)
      ) {
        callback({});
        return;
      }
      // Answer with an empty successful response instead of failing the
      // request, so pages cannot detect the blocker from failed ad requests.
      const stub = STUB_RESPONSES[details.resourceType];
      callback(stub ? { redirectURL: stub } : { cancel: true });
    },
  );
};

// Hides the in-page ad placeholders and "ad blocker detected" notices of sites
// that render them themselves (currently Outlook), for services with blocking.
export const watchAdPlaceholders = (contents: WebContents): void => {
  contents.on('dom-ready', () => {
    if (!sessionsWithBlocking.has(contents.session)) {
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
  });
};
