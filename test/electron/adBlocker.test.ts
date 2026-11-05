const mockOnBeforeRequest = jest.fn();
const mockOnHeadersReceived = jest.fn();
const mockRegisterPreloadScript = jest.fn(() => 'preload-id');
const mockUnregisterPreloadScript = jest.fn();
// Like Electron, one session object per partition.
const sessionsByPartition = new Map<string, object>();
const mockFromPartition = jest.fn((partition: string) => {
  if (!sessionsByPartition.has(partition)) {
    sessionsByPartition.set(partition, {
      webRequest: {
        onBeforeRequest: mockOnBeforeRequest,
        onHeadersReceived: mockOnHeadersReceived,
      },
      registerPreloadScript: mockRegisterPreloadScript,
      unregisterPreloadScript: mockUnregisterPreloadScript,
    });
  }
  return sessionsByPartition.get(partition);
});
const mockIpcHandle = jest.fn();
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn<Promise<void>, [string, Uint8Array]>(
  async () => {},
);
const mockShow = jest.fn();
const mockNotification = jest.fn(() => ({ show: mockShow }));
(mockNotification as any).isSupported = () => true;
const mockFetch = jest.fn();

jest.mock('node:fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}));
jest.mock('electron', () => ({
  Notification: mockNotification,
  ipcMain: { handle: mockIpcHandle, removeHandler: jest.fn() },
  session: { fromPartition: mockFromPartition },
}));
jest.mock('../../src/environment-remote', () => ({
  userDataPath: (...segments: string[]) => segments.join('/'),
}));

// Ghostery's lists are ABP-format; this stands in for every list it downloads.
const LIST = [
  '! comment',
  '||ads.test^',
  '||tracker.test^',
  '||thirdparty.test^$third-party',
  '||clientmetrics-pa.googleapis.com^',
].join('\n');

// Ghostery's resources file is JSON with the scriptlets; every other URL is a
// list. json-prune is the scriptlet the YouTube rule uses.
const RESOURCES = JSON.stringify({
  scriptlets: [
    {
      name: 'json-prune.js',
      aliases: ['json-prune'],
      body: '(function () {})();',
      dependencies: [],
    },
  ],
});
const listsReturning = (content: string) => async (url: string) => ({
  ok: true,
  text: async () => (url.endsWith('/resources.json') ? RESOURCES : content),
});

const failingLists = async () => ({
  ok: false,
  status: 500,
  text: async () => '',
});

const loadModule = () =>
  // eslint-disable-next-line global-require
  require('../../src/electron/adBlocker');

// Returns the listener Electron would call for each request.
const requestFilter = (): ((
  details: object,
  callback: (response: object) => void,
) => void) => mockOnBeforeRequest.mock.calls.at(-1)?.[1];

// Resolves with the blocker's answer. Requests wait for the lists, so this
// also returns only once the engine has loaded.
const request = (
  url: string,
  resourceType = 'script',
  referrer = 'https://service.test/',
) =>
  new Promise(resolve => {
    requestFilter()({ id: 1, url, resourceType, referrer }, resolve);
  });

describe('adBlocker', () => {
  let adBlocker: typeof import('../../src/electron/adBlocker');

  beforeEach(() => {
    jest.resetModules();
    sessionsByPartition.clear();
    mockIpcHandle.mockClear();
    mockFetch.mockImplementation(listsReturning(LIST));
    global.fetch = mockFetch as unknown as typeof fetch;
    adBlocker = loadModule();
  });

  it('blocks listed domains and their subdomains', async () => {
    await adBlocker.setServiceAdBlock('service-1', true);

    expect(await request('https://ads.test/banner.js')).toEqual({
      cancel: true,
    });
    expect(await request('https://sub.ads.test/x.gif', 'image')).toEqual({
      cancel: true,
    });
    expect(await request('https://tracker.test/t', 'xhr')).toEqual({
      cancel: true,
    });
    expect(await request('https://site.test/app.js')).toEqual({});
  });

  it('applies third-party rules only to requests from other sites', async () => {
    await adBlocker.setServiceAdBlock('service-1', true);

    expect(
      await request('https://thirdparty.test/t', 'xhr', 'https://site.test/'),
    ).toEqual({ cancel: true });
    expect(
      await request(
        'https://thirdparty.test/t',
        'xhr',
        'https://thirdparty.test/',
      ),
    ).toEqual({});
  });

  it('never blocks main frames, sign-in pages or the Google account hosts', async () => {
    await adBlocker.setServiceAdBlock('service-1', true);

    expect(await request('https://ads.test/', 'mainFrame')).toEqual({});
    expect(
      await request(
        'https://ads.test/banner.js',
        'script',
        'https://accounts.google.com/signin',
      ),
    ).toEqual({});
    expect(
      await request('https://clientmetrics-pa.googleapis.com/log'),
    ).toEqual({});
  });

  it('enables network and cosmetic filtering only in the service session', async () => {
    await adBlocker.setServiceAdBlock('service-1', true);

    expect(mockFromPartition).toHaveBeenCalledWith('persist:service-service-1');
    expect(mockRegisterPreloadScript).toHaveBeenCalledWith({
      type: 'frame',
      filePath: expect.stringContaining('adblocker-electron-preload'),
    });
    expect(mockOnBeforeRequest).toHaveBeenCalledWith(
      { urls: ['<all_urls>'] },
      expect.any(Function),
    );
  });

  it('never rewrites response headers, which crashed the app', async () => {
    await adBlocker.setServiceAdBlock('service-1', true);

    expect(mockOnHeadersReceived).not.toHaveBeenCalled();
  });

  it('removes its listeners and preload when a service is disabled', async () => {
    await adBlocker.setServiceAdBlock('service-1', true);
    await adBlocker.setServiceAdBlock('service-1', false);

    expect(mockOnBeforeRequest).toHaveBeenLastCalledWith(null);
    expect(mockUnregisterPreloadScript).toHaveBeenCalledWith('preload-id');
  });

  it('registers the cosmetic IPC channels once, for all services', async () => {
    await adBlocker.setServiceAdBlock('service-1', true);
    await adBlocker.setServiceAdBlock('service-2', true);

    const channels = mockIpcHandle.mock.calls.map(([channel]) => channel);
    expect(channels).toEqual([
      '@ghostery/adblocker/inject-cosmetic-filters',
      '@ghostery/adblocker/is-mutation-observer-enabled',
    ]);
  });

  it('syncs the lists on start, caches the engine and notifies the rule count', async () => {
    await adBlocker.setServiceAdBlock('service-1', true);
    await request('https://site.test/');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('ublock-origin/filters.txt'),
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      'adblocker-engine.bin',
      expect.any(Uint8Array),
    );
    expect(mockNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringMatching(/Filter lists synced successfully/),
      }),
    );
  });

  it('falls back to the cached engine when the lists cannot be downloaded', async () => {
    await adBlocker.setServiceAdBlock('service-1', true);
    await request('https://site.test/');
    const cached = mockWriteFile.mock.calls[0][1] as Uint8Array;

    jest.resetModules();
    mockFetch.mockImplementation(failingLists);
    mockReadFile.mockResolvedValue(cached);
    adBlocker = loadModule();
    await adBlocker.setServiceAdBlock('service-2', true);
    await request('https://site.test/');

    expect(mockReadFile).toHaveBeenCalledWith('adblocker-engine.bin');
    expect(await request('https://ads.test/banner.js')).toEqual({
      cancel: true,
    });
  });

  it('lets requests through when neither the lists nor the cache are available', async () => {
    mockFetch.mockImplementation(failingLists);
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    adBlocker = loadModule();

    await adBlocker.setServiceAdBlock('service-1', true);

    expect(await request('https://ads.test/banner.js')).toEqual({});
  });

  it('holds requests until the lists load instead of letting them pass', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    mockFetch.mockImplementation(async (url: string) => {
      await gate;
      return listsReturning(LIST)(url);
    });
    adBlocker = loadModule();

    adBlocker.setServiceAdBlock('service-1', true);
    let answered = false;
    const response = new Promise(resolve => {
      requestFilter()(
        {
          id: 1,
          url: 'https://ads.test/banner.js',
          resourceType: 'script',
          referrer: 'https://service.test/',
        },
        (result: object) => {
          answered = true;
          resolve(result);
        },
      );
    });
    expect(answered).toBe(false);

    release();
    expect(await response).toEqual({ cancel: true });
  });

  it('injects the YouTube scriptlet into YouTube pages only', async () => {
    await adBlocker.setServiceAdBlock('service-1', true);
    const [, inject] =
      mockIpcHandle.mock.calls
        .filter(
          ([channel]) =>
            channel === '@ghostery/adblocker/inject-cosmetic-filters',
        )
        .at(-1) ?? [];
    const injectInto = async (url: string) => {
      const executeJavaScript = jest.fn(async () => {});
      await inject(
        {
          frameId: 1,
          processId: 1,
          sender: { insertCSS: jest.fn(), executeJavaScript },
        },
        url,
      );
      return executeJavaScript.mock.calls.length;
    };

    expect(await injectInto('https://music.youtube.com/')).toBeGreaterThan(0);
    expect(
      await injectInto('https://www.youtube.com/watch?v=x'),
    ).toBeGreaterThan(0);
    expect(await injectInto('https://site.test/')).toBe(0);
  });
  it('skips video ads only on YouTube pages, for services with blocking', async () => {
    await adBlocker.setServiceAdBlock('service-1', true);
    const session = mockFromPartition('persist:service-service-1');
    const pageScripts = (url: string) => {
      let onReady: (() => void) | undefined;
      const executeJavaScript = jest.fn(
        async (code: string) => code && undefined,
      );
      adBlocker.watchAdPlaceholders({
        session,
        on: (event: string, listener: () => void) => {
          if (event === 'dom-ready') onReady = listener;
        },
        getURL: () => url,
        executeJavaScript,
      } as unknown as Electron.WebContents);
      onReady?.();
      return executeJavaScript.mock.calls.map(([code]) => String(code));
    };

    expect(
      pageScripts('https://music.youtube.com/watch?v=x').some(code =>
        code.includes('ad-showing'),
      ),
    ).toBe(true);
    expect(pageScripts('https://site.test/')).toEqual([]);
  });
});
