import { mkdtempSync } from 'node:fs';
/* eslint-disable unicorn/no-process-exit, unicorn/prefer-top-level-await -- CommonJS child process, exit codes are the result */
/**
 * Starts the internal server in plain Node and prints the results of a few
 * requests as JSON on stdout. Run by `server.test.ts` in a child process,
 * because Jest cannot load the ESM-only AdonisJS packages.
 *
 * Electron modules are replaced with stubs; only the server code is real.
 * The server is transpiled file by file first (same as the app build), because
 * bundling changes `__dirname`, which the server uses to find its database template.
 */
import Module from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = Number(process.env.SMOKE_PORT);
const TOKEN = 'smoke-token';
const HEADERS = {
  'X-Franz-Version': '7.2.4',
  'X-Ferdium-Local-Token': TOKEN,
  'Content-Type': 'application/json',
};

const appStub = new Proxy(
  {
    getVersion: () => '7.2.4',
    getPath: () => tmpdir(),
    getName: () => 'ferdium',
    getLocale: () => 'en-US',
    isPackaged: false,
  },
  { get: (target, key) => (key in target ? target[key] : () => '') },
);
const electronStub = {
  app: appStub,
  ipcMain: { on() {}, handle() {} },
  shell: {},
  nativeTheme: {},
  session: {},
};

// `_load` is Node's internal module loader; it is not in the public typings
type ModuleLoader = (
  request: string,
  parent: unknown,
  isMain: boolean,
) => unknown;
const nodeModule = Module as unknown as { _load: ModuleLoader };
const loadModule = nodeModule._load;
nodeModule._load = function patchedLoad(request, parent, isMain) {
  if (request === 'electron') return electronStub;
  if (request.startsWith('@electron/remote')) return {};
  return loadModule.call(this, request, parent, isMain);
};

async function main() {
  const userPath = mkdtempSync(join(tmpdir(), 'ferdium-smoke-'));
  // The module path comes from server.test.ts, so it cannot be a literal
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const { server } = require(process.env.SMOKE_SERVER_MODULE!);
  await server(userPath, PORT, TOKEN);

  const base = `http://localhost:${PORT}`;
  const results: Record<string, unknown> = {};

  const health = await fetch(`${base}/health`, { headers: HEADERS });
  results.health = { status: health.status, body: await health.json() };

  const unauthorized = await fetch(`${base}/v1/me`);
  results.unauthorized = { status: unauthorized.status };

  const me = await fetch(`${base}/v1/me`, { headers: HEADERS });
  results.me = { status: me.status, body: await me.json() };

  const created = await fetch(`${base}/v1/service`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ name: 'Smoke', recipeId: 'slack' }),
  });
  const createdBody = await created.json();
  results.createService = { status: created.status };

  const services = await fetch(`${base}/v1/me/services`, { headers: HEADERS });
  const serviceList = await services.json();
  results.listServices = {
    status: services.status,
    names: serviceList.map((s: { name: string }) => s.name),
  };

  const workspace = await fetch(`${base}/v1/workspace`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ name: 'Work' }),
  });
  const workspaceBody = await workspace.json();
  results.createWorkspace = {
    status: workspace.status,
    name: workspaceBody.name,
  };

  const deleted = await fetch(`${base}/v1/service/${createdBody.data.id}`, {
    method: 'DELETE',
    headers: HEADERS,
  });
  results.deleteService = { status: deleted.status };

  const tokenPage = await fetch(`${base}/token/${TOKEN}`, {
    redirect: 'manual',
  });
  const cookie = tokenPage.headers.get('set-cookie') ?? '';
  results.tokenRoute = { status: tokenPage.status, hasCookie: cookie !== '' };

  const index = await fetch(`${base}/`, {
    headers: { Cookie: cookie.split(';')[0] },
  });
  const indexHtml = await index.text();
  results.index = {
    status: index.status,
    hasLayout: indexHtml.includes('<html'),
    rawTemplate: indexHtml.includes('@component'),
  };

  const css = await fetch(`${base}/css/main.css`);
  results.staticCss = {
    status: css.status,
    type: css.headers.get('content-type'),
  };

  process.stdout.write(`SMOKE_RESULT ${JSON.stringify(results)}\n`);
  process.exit(0);
}

main().catch(error => {
  process.stderr.write(`SMOKE_ERROR ${error?.stack}\n`);
  process.exit(1);
});
