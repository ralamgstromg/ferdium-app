// Electron keeps one onBeforeSendHeaders listener per session, so header
// changes for a session are collected here and applied by a single listener.
type HeaderModifier = (
  requestHeaders: Record<string, string>,
  url: string,
) => void;

const modifiersBySession = new WeakMap<
  Electron.Session,
  Map<string, HeaderModifier>
>();

const hasOwn = (object: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key);

// Header names are case-insensitive; keep the spelling already in the request.
export const setHeader = (
  requestHeaders: Record<string, string>,
  name: string,
  value: string,
): void => {
  const lower = name.toLowerCase();
  const existing = Object.keys(requestHeaders).find(
    key => key.toLowerCase() === lower,
  );
  // eslint-disable-next-line no-param-reassign
  requestHeaders[existing ?? name] = value;
};

// Matches Electron webRequest URL patterns such as '*://*/*' and '<all_urls>'.
export const urlMatchesPatterns = (patterns: string[], url: string): boolean =>
  patterns.some(pattern => {
    if (pattern === '<all_urls>') {
      return true;
    }
    const source = pattern
      .split('*')
      .map(part => part.replaceAll(/[$()+.?[\\\]^{|}]/g, '\\$&'))
      .join('.*');
    return new RegExp(`^${source}$`).test(url);
  });

const addModifier = (
  ses: Electron.Session,
  key: string,
  modifier: HeaderModifier,
): void => {
  let modifiers = modifiersBySession.get(ses);
  if (modifiers === undefined) {
    modifiers = new Map();
    modifiersBySession.set(ses, modifiers);
    ses.webRequest.onBeforeSendHeaders(
      { urls: ['<all_urls>'] },
      (details, callback) => {
        const current = modifiersBySession.get(ses);
        for (const apply of current?.values() ?? []) {
          apply(details.requestHeaders, details.url);
        }
        callback({ requestHeaders: details.requestHeaders });
      },
    );
  }
  // Keyed, so the same rule sent again (a service reload) is replaced, not stacked.
  modifiers.set(key, modifier);
};

// Recipe-defined headers for the URLs of one request filter.
export const addRecipeHeaders = (
  ses: Electron.Session,
  urls: string[],
  headers: Record<string, string>,
): void => {
  const key = `recipe:${JSON.stringify(urls)}:${JSON.stringify(headers)}`;
  addModifier(ses, key, (requestHeaders, url) => {
    if (!urlMatchesPatterns(urls, url)) {
      return;
    }
    for (const name of Object.keys(headers)) {
      if (hasOwn(headers, name)) {
        setHeader(requestHeaders, name, headers[name]);
      }
    }
  });
};
