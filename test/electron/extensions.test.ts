import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mockHandlers = new Map<string, (...args: any[]) => any>();
const mockShowOpenDialog = jest.fn();
const mockRestoreAdBlockListener = jest.fn();
let mockStoreDir = '';

jest.mock('electron', () => ({
  dialog: {
    showOpenDialog: (...args: unknown[]) => mockShowOpenDialog(...args),
  },
  ipcMain: {
    handle: (channel: string, handler: (...args: any[]) => any) =>
      mockHandlers.set(channel, handler),
  },
}));
jest.mock('../../src/electron/adBlocker', () => ({
  restoreAdBlockListener: (...args: unknown[]) =>
    mockRestoreAdBlockListener(...args),
}));
jest.mock('../../src/environment-remote', () => ({
  userDataPath: (...segments: string[]) => join(mockStoreDir, ...segments),
}));

// Electron's session: loads, lists and removes unpacked extensions.
const makeSession = () => {
  const extensions: { id: string; path: string }[] = [];
  const api = {
    loadExtension: jest.fn(async (path: string) => {
      const extension = { id: `id-${extensions.length}`, path };
      extensions.push(extension);
      return extension;
    }),
    getAllExtensions: () => [...extensions],
    removeExtension: jest.fn((id: string) => {
      const index = extensions.findIndex(extension => extension.id === id);
      extensions.splice(index, 1);
    }),
  };
  return { extensions: api } as unknown as Electron.Session & {
    extensions: typeof api;
  };
};

const makeExtensionFolder = async (name: string, manifestVersion = 3) => {
  const folder = join(mockStoreDir, name);
  await mkdir(folder, { recursive: true });
  await writeFile(
    join(folder, 'manifest.json'),
    JSON.stringify({
      name,
      version: '1.2.3',
      manifest_version: manifestVersion,
    }),
  );
  return folder;
};

const loadModule = () =>
  // eslint-disable-next-line global-require
  require('../../src/electron/extensions') as typeof import('../../src/electron/extensions');

describe('extensions', () => {
  let extensions: typeof import('../../src/electron/extensions');

  beforeEach(async () => {
    jest.resetModules();
    mockHandlers.clear();
    mockShowOpenDialog.mockReset();
    mockRestoreAdBlockListener.mockClear();
    mockStoreDir = await mkdtemp(join(tmpdir(), 'ferdium-extensions-'));
    extensions = loadModule();
    extensions.registerExtensionHandlers();
  });

  it('accepts a folder with a Chrome manifest and lists it', async () => {
    const folder = await makeExtensionFolder('Helper');
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [folder],
    });

    const added = await mockHandlers.get('extensions-add')?.();
    const list = await mockHandlers.get('extensions-list')?.();

    expect(added).toEqual({ folder, name: 'Helper', version: '1.2.3' });
    expect(list).toEqual([{ folder, name: 'Helper', version: '1.2.3' }]);
  });

  it('rejects folders that are not Chrome extensions and stores nothing', async () => {
    const withoutManifest = join(mockStoreDir, 'no-manifest');
    await mkdir(withoutManifest, { recursive: true });
    const oldManifest = await makeExtensionFolder('Old', 1);

    const addFrom = (folder: string) => {
      mockShowOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: [folder],
      });
      return mockHandlers.get('extensions-add')?.();
    };
    await expect(addFrom(withoutManifest)).rejects.toThrow();
    await expect(addFrom(oldManifest)).rejects.toThrow();
    expect(await mockHandlers.get('extensions-list')?.()).toEqual([]);
  });

  it('loads stored extensions into each webview session and restores the blocker listener', async () => {
    const folder = await makeExtensionFolder('Helper');
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [folder],
    });
    await mockHandlers.get('extensions-add')?.();

    const sessionA = makeSession();
    const sessionB = makeSession();
    await extensions.attachExtensions(sessionA);
    await extensions.attachExtensions(sessionB);

    expect(sessionA.extensions.loadExtension).toHaveBeenCalledWith(folder);
    expect(sessionB.extensions.loadExtension).toHaveBeenCalledWith(folder);
    expect(mockRestoreAdBlockListener).toHaveBeenCalledWith(sessionA);
    expect(mockRestoreAdBlockListener).toHaveBeenCalledWith(sessionB);
  });

  it('removes an extension from every session and from the store', async () => {
    const folder = await makeExtensionFolder('Helper');
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [folder],
    });
    const session = makeSession();
    await extensions.attachExtensions(session);
    await mockHandlers.get('extensions-add')?.();

    await mockHandlers.get('extensions-remove')?.(null, folder);

    expect(session.extensions.removeExtension).toHaveBeenCalledWith('id-0');
    expect(session.extensions.getAllExtensions()).toEqual([]);
    expect(await mockHandlers.get('extensions-list')?.()).toEqual([]);
  });
});
