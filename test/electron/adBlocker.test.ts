const mockOnBeforeRequest = jest.fn();
const mockSession = { webRequest: { onBeforeRequest: mockOnBeforeRequest } };
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn(async () => {});
const mockShow = jest.fn();
const mockNotification = jest.fn(() => ({ show: mockShow }));
(mockNotification as any).isSupported = () => true;

jest.mock('node:fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}));
jest.mock('electron', () => ({
  Notification: mockNotification,
  session: { fromPartition: jest.fn(() => mockSession) },
}));
jest.mock('../../src/environment-remote', () => ({
  userDataPath: (...segments: string[]) => segments.join('/'),
}));

const loadModule = async () =>
  // eslint-disable-next-line global-require
  require('../../src/electron/adBlocker');

const LIST = [
  '# comment',
  '0.0.0.0 ads.test',
  '||tracker.test^',
  '||thirdparty.test^$third-party',
  '||path.test/ads/',
  'cosmetic.test##.banner',
  '@@||allowed.test^',
  'csi.gstatic.com',
  'localhost',
].join('\n');

// Runs the registered request handler and returns what it answered.
const answer = (url: string, resourceType = 'script', referrer = ''): any => {
  const handler = mockOnBeforeRequest.mock.calls.at(-1)[1];
  let result: any;
  handler({ url, resourceType, referrer }, (r: any) => {
    result = r;
  });
  return result;
};
const isBlockedRequest = (url: string, resourceType = 'script'): boolean => {
  const result = answer(url, resourceType);
  return result.cancel === true || result.redirectURL !== undefined;
};

const contentsFor = (url: string) => {
  const handlers: Record<string, () => void> = {};
  return {
    session: mockSession,
    getURL: () => url,
    executeJavaScript: jest.fn(async () => {}),
    on: (event: string, handler: () => void) => {
      handlers[event] = handler;
    },
    fire: (event: string) => handlers[event](),
  };
};

describe('adBlocker', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockReadFile.mockRejectedValue(new Error('no cache'));
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => LIST,
    })) as any;
  });

  it('syncs the lists once, caches them and notifies the record count', async () => {
    const { setServiceAdBlock } = await loadModule();
    await setServiceAdBlock('a', true);
    await setServiceAdBlock('b', true);

    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(mockOnBeforeRequest).toHaveBeenCalledTimes(2);
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(mockNotification).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining('4 records') }),
    );
  });

  it('blocks listed hosts and subdomains, not other requests or pages', async () => {
    const { setServiceAdBlock } = await loadModule();
    await setServiceAdBlock('a', true);

    expect(isBlockedRequest('https://ads.test/x.js')).toBe(true);
    expect(isBlockedRequest('https://cdn.tracker.test/p.gif')).toBe(true);
    expect(isBlockedRequest('https://thirdparty.test/x.js')).toBe(true);
    // Rules that need a full filter engine must not turn into host blocks.
    expect(isBlockedRequest('https://path.test/x.js')).toBe(false);
    expect(isBlockedRequest('https://cosmetic.test/x.js')).toBe(false);
    expect(isBlockedRequest('https://allowed.test/x.js')).toBe(false);
    expect(isBlockedRequest('https://csi.gstatic.com/x')).toBe(false);
    expect(isBlockedRequest('https://example.com/x.js')).toBe(false);
    expect(isBlockedRequest('https://ads.test/', 'mainFrame')).toBe(false);
  });

  it('answers blocked requests with an empty response, not an error', async () => {
    const { setServiceAdBlock } = await loadModule();
    await setServiceAdBlock('a', true);

    expect(answer('https://ads.test/x.js', 'script')).toEqual({
      redirectURL: 'data:text/javascript,',
    });
    expect(answer('https://ads.test/x', 'xhr').redirectURL).toBeDefined();
    expect(answer('https://ads.test/p', 'ping')).toEqual({ cancel: true });
  });

  it('does not filter requests made by identity provider sign-in pages', async () => {
    const { setServiceAdBlock } = await loadModule();
    await setServiceAdBlock('a', true);

    expect(
      answer('https://ads.test/x.js', 'script', 'https://accounts.google.com/'),
    ).toEqual({});
    expect(
      answer('https://ads.test/x.js', 'script', 'https://mail.google.com/'),
    ).not.toEqual({});
  });

  it('downloads the lists on every start even with a fresh cache', async () => {
    mockReadFile.mockResolvedValue('old.test');
    const { setServiceAdBlock } = await loadModule();
    await setServiceAdBlock('a', true);

    expect(global.fetch).toHaveBeenCalled();
    expect(isBlockedRequest('https://ads.test/x.js')).toBe(true);
    expect(isBlockedRequest('https://old.test/x.js')).toBe(false);
  });

  it('falls back to a stale cache when offline', async () => {
    mockReadFile.mockResolvedValue('ads.test');
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as any;
    const { setServiceAdBlock } = await loadModule();
    await setServiceAdBlock('a', true);

    expect(isBlockedRequest('https://ads.test/x.js')).toBe(true);
  });

  it('removes the handler only from the disabled session', async () => {
    const { setServiceAdBlock } = await loadModule();
    await setServiceAdBlock('a', false);

    expect(mockOnBeforeRequest).toHaveBeenCalledWith(null);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('degrades to no blocking with no network and no cache', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as any;
    const { setServiceAdBlock } = await loadModule();
    await expect(setServiceAdBlock('a', true)).resolves.toBeUndefined();

    expect(mockOnBeforeRequest).not.toHaveBeenCalled();
  });

  describe('watchAdPlaceholders', () => {
    it('cleans Outlook only for sessions with blocking enabled', async () => {
      const { setServiceAdBlock, watchAdPlaceholders } = await loadModule();
      const outlook = contentsFor('https://outlook.live.com/mail/');
      watchAdPlaceholders(outlook);

      outlook.fire('dom-ready');
      expect(outlook.executeJavaScript).not.toHaveBeenCalled();

      await setServiceAdBlock('a', true);
      outlook.fire('dom-ready');
      expect(outlook.executeJavaScript).toHaveBeenCalledTimes(1);

      await setServiceAdBlock('a', false);
      outlook.fire('dom-ready');
      expect(outlook.executeJavaScript).toHaveBeenCalledTimes(1);
    });

    it('leaves other sites untouched', async () => {
      const { setServiceAdBlock, watchAdPlaceholders } = await loadModule();
      const other = contentsFor('https://example.com/');
      watchAdPlaceholders(other);
      await setServiceAdBlock('a', true);
      other.fire('dom-ready');

      expect(other.executeJavaScript).not.toHaveBeenCalled();
    });
  });
});
