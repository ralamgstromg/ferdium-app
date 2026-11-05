import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { build } from 'esbuild';
import { copySync, emptyDirSync } from 'fs-extra';
import glob from 'tiny-glob';

/**
 * Smoke test for the internal server (AdonisJS 7).
 *
 * Jest cannot load the ESM-only AdonisJS packages, and bundling changes
 * `__dirname`. So the server is transpiled file by file (like the app build)
 * into a cache folder inside node_modules, and a child Node process runs it
 * (see `smokeRunner.ts`). The child boots the real server, sends a few
 * requests, and prints the results.
 */
const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');
const OUT = join(
  ROOT,
  'node_modules',
  '.cache',
  'ferdium-internal-server-smoke',
);
const PORT = 46_590;

type SmokeResults = {
  health: { status: number; body: { api: string; db: string } };
  unauthorized: { status: number };
  me: { status: number; body: { firstname: string; locale?: string } };
  createService: { status: number };
  listServices: { status: number; names: string[] };
  createWorkspace: { status: number; name: string };
  deleteService: { status: number };
  tokenRoute: { status: number; hasCookie: boolean };
  index: { status: number; hasLayout: boolean; rawTemplate: boolean };
  staticCss: { status: number; type: string };
};

async function buildServer(): Promise<void> {
  emptyDirSync(OUT);

  // Non-code assets the server reads at runtime (the app build copies these too)
  const internalServer = join(SRC, 'internal-server');
  copySync(
    join(internalServer, 'database'),
    join(OUT, 'internal-server', 'database'),
  );
  copySync(
    join(internalServer, 'resources'),
    join(OUT, 'internal-server', 'resources'),
  );
  copySync(
    join(internalServer, 'public'),
    join(OUT, 'internal-server', 'public'),
  );

  const files = await glob('src/**/*.{ts,js}', { cwd: ROOT, filesOnly: true });
  const sources = files
    .filter(file => !file.endsWith('.d.ts'))
    .map(file => join(ROOT, file));

  await build({
    entryPoints: sources,
    outbase: SRC,
    outdir: join(OUT, 'src-out'),
    format: 'cjs',
    platform: 'node',
    bundle: false,
    logLevel: 'silent',
  });
  // Source files are emitted under src-out/ so they sit next to the copied assets
  copySync(join(OUT, 'src-out'), OUT);

  await build({
    entryPoints: [join(__dirname, 'smokeRunner.ts')],
    outfile: join(OUT, 'smokeRunner.js'),
    format: 'cjs',
    platform: 'node',
    bundle: false,
    logLevel: 'silent',
  });
}

function runSmoke(): SmokeResults {
  const child = spawnSync(process.execPath, [join(OUT, 'smokeRunner.js')], {
    cwd: ROOT,
    env: {
      ...process.env,
      SMOKE_PORT: String(PORT),
      SMOKE_SERVER_MODULE: join(OUT, 'internal-server', 'start.js'),
    },
    encoding: 'utf8',
    timeout: 120_000,
  });

  const lines = child.stdout.split('\n');
  const line = lines.find(output => output.startsWith('SMOKE_RESULT '));
  if (!line) {
    throw new Error(
      `Internal server smoke run failed (exit ${child.status}):\n${child.stderr}`,
    );
  }
  return JSON.parse(line.slice('SMOKE_RESULT '.length));
}

describe('internal server', () => {
  let results: SmokeResults;

  beforeAll(async () => {
    await buildServer();
    results = runSmoke();
  }, 180_000);

  it('answers the health check', () => {
    expect(results.health).toEqual({
      status: 200,
      body: { api: 'success', db: 'success' },
    });
  });

  it('rejects API calls without the session token', () => {
    expect(results.unauthorized.status).toBe(403);
  });

  it('returns the current user from the database', () => {
    expect(results.me.status).toBe(200);
    expect(results.me.body.firstname).toBe('Ferdium');
  });

  it('creates, lists and deletes services', () => {
    expect(results.createService.status).toBe(200);
    expect(results.listServices).toEqual({ status: 200, names: ['Smoke'] });
    expect(results.deleteService.status).toBe(200);
  });

  it('creates workspaces', () => {
    expect(results.createWorkspace).toEqual({ status: 200, name: 'Work' });
  });

  it('sets the browser cookie only for the session token', () => {
    expect(results.tokenRoute).toEqual({ status: 302, hasCookie: true });
  });

  it('renders the Edge pages with their layout', () => {
    expect(results.index).toEqual({
      status: 200,
      hasLayout: true,
      rawTemplate: false,
    });
  });

  it('serves static assets with a content type', () => {
    expect(results.staticCss.status).toBe(200);
    expect(results.staticCss.type).toContain('text/css');
  });
});
