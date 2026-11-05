import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { dialog, ipcMain } from 'electron';
import { userDataPath } from '../environment-remote';
import { restoreAdBlockListener } from './adBlocker';

const debug = require('../preload-safe-debug')('Ferdium:extensions');

const STORE_PATH = userDataPath('extensions.json');

export type ExtensionInfo = { folder: string; name: string; version: string };

// Extensions are unpacked folders chosen by the user. They are loaded into the
// webview sessions of the services only, never into the app's own session.
const sessionsWithExtensions = new Set<Electron.Session>();
const loadStarted = new WeakSet<Electron.Session>();

const readStore = async (): Promise<string[]> => {
  try {
    const folders: unknown = JSON.parse(await readFile(STORE_PATH, 'utf8'));
    return Array.isArray(folders)
      ? folders.filter((folder): folder is string => typeof folder === 'string')
      : [];
  } catch {
    return [];
  }
};

const writeStore = (folders: string[]) =>
  writeFile(STORE_PATH, JSON.stringify(folders));

// Electron only loads Chrome extensions (Manifest V2 or V3) from a folder with
// a manifest.json, so that is what gets validated before an extension is stored.
const readManifest = async (folder: string) => {
  const manifest = JSON.parse(
    await readFile(join(folder, 'manifest.json'), 'utf8'),
  ) as Record<string, unknown>;
  if (
    typeof manifest.name !== 'string' ||
    (manifest.manifest_version !== 2 && manifest.manifest_version !== 3)
  ) {
    throw new Error(`Not a Chrome extension: ${folder}`);
  }
  return {
    name: manifest.name,
    version: typeof manifest.version === 'string' ? manifest.version : '',
  };
};

const loadFolderInto = async (ses: Electron.Session, folder: string) => {
  if (ses.extensions.getAllExtensions().some(ext => ext.path === folder)) {
    return;
  }
  try {
    await ses.extensions.loadExtension(folder);
    // Electron keeps one webRequest listener per session, and an extension can
    // replace the ad blocker's. Put the blocker's back so it keeps priority.
    restoreAdBlockListener(ses);
  } catch (error) {
    debug('Could not load extension', folder, error);
  }
};

const loadStoredInto = async (ses: Electron.Session) => {
  const folders = await readStore();
  await Promise.all(folders.map(folder => loadFolderInto(ses, folder)));
};

// Called for every service webview session as it is created.
export const attachExtensions = (ses: Electron.Session): Promise<void> => {
  sessionsWithExtensions.add(ses);
  if (loadStarted.has(ses)) {
    return Promise.resolve();
  }
  loadStarted.add(ses);
  return loadStoredInto(ses);
};

const addExtension = async (folder: string): Promise<ExtensionInfo> => {
  const { name, version } = await readManifest(folder);
  const folders = await readStore();
  if (!folders.includes(folder)) {
    await writeStore([...folders, folder]);
  }
  await Promise.all(
    [...sessionsWithExtensions].map(ses => loadFolderInto(ses, folder)),
  );
  return { folder, name, version };
};

const removeExtension = async (folder: string): Promise<void> => {
  const folders = await readStore();
  await writeStore(folders.filter(stored => stored !== folder));
  for (const ses of sessionsWithExtensions) {
    for (const extension of ses.extensions.getAllExtensions()) {
      if (extension.path === folder) {
        ses.extensions.removeExtension(extension.id);
      }
    }
  }
};

const describeFolder = async (folder: string): Promise<ExtensionInfo> => {
  try {
    return { folder, ...(await readManifest(folder)) };
  } catch {
    // The folder was moved or deleted; it stays listed so it can be removed.
    return { folder, name: basename(folder), version: '' };
  }
};

export const registerExtensionHandlers = (): void => {
  ipcMain.handle('extensions-list', async (): Promise<ExtensionInfo[]> => {
    const folders = await readStore();
    return Promise.all(folders.map(folder => describeFolder(folder)));
  });

  ipcMain.handle('extensions-add', async (): Promise<ExtensionInfo | null> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (canceled || filePaths.length === 0) {
      return null;
    }
    return addExtension(filePaths[0]);
  });

  ipcMain.handle('extensions-remove', async (_event, folder: unknown) => {
    if (typeof folder === 'string') {
      await removeExtension(folder);
    }
  });
};
