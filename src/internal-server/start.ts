import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chmod, readFile, stat, writeFile } from 'fs-extra';
import { LOCAL_HOSTNAME } from '../config';
import { isWindows } from '../environment';

// Adonis 7 is ESM-only. `require()` loads it because Electron runs Node 22.12+
// (`require(esm)`), and the app is built as CommonJS, one file per source file.
const { IgnitorFactory } = require('@adonisjs/core/factories');
// `defineConfig` fills the serializers and other defaults the HTTP server needs
const { defineConfig: defineHttpConfig } = require('@adonisjs/core/http');
const {
  default: lucidDatabaseProvider,
} = require('@adonisjs/lucid/database_provider');
const kernel = require('./start/kernel');
const routes = require('./start/routes');
const { migrate } = require('./start/migrate');
const { setApp } = require('./app/Database');

async function ensureDB(dbPath: string): Promise<void> {
  try {
    await stat(dbPath);
  } catch {
    // Database does not exist.
    // Manually copy file
    // We can't use copyFile here as it will cause the file to be readonly on Windows
    const dbTemplatePath = join(__dirname, 'database', 'template.sqlite');
    const dbTemplate = await readFile(dbTemplatePath);
    await writeFile(dbPath, dbTemplate);

    // Change permissions to ensure to file is not read-only
    if (isWindows) {
      const stats = await stat(dbPath);
      // eslint-disable-next-line no-bitwise
      await chmod(dbPath, stats.mode | 146);
    }
  }
}

/**
 * Boots the internal server (AdonisJS 7) and resolves once it is listening.
 *
 * Configuration is passed in code instead of a `config/` folder, so the
 * server does not depend on files that the Electron build would not copy.
 */
export const server = async (userPath: string, port: number, token: string) => {
  const dbPath = join(userPath, 'server.sqlite');
  await ensureDB(dbPath);

  // Read by the controllers and by the route guards
  process.env.DB_PATH = dbPath;
  process.env.USER_PATH = userPath;
  process.env.HOST = LOCAL_HOSTNAME;
  process.env.PORT = port.toString();
  process.env.FERDIUM_LOCAL_TOKEN = token;
  // Default from the former env.ini: enables the Franz recipe library and account import
  process.env.CONNECT_WITH_FRANZ ??= 'true';

  const ignitor = new IgnitorFactory()
    .withCoreConfig()
    .withCoreProviders()
    .merge({
      rcFileContents: {
        providers: [() => Promise.resolve({ default: lucidDatabaseProvider })],
      },
      config: {
        // Replaces the whole `app` section set by withCoreConfig, so `http` is repeated here
        app: {
          name: 'Ferdium Internal Server',
          appKey: 'FERDIUMINTERNALSERVER',
          http: defineHttpConfig({
            allowMethodSpoofing: true,
            trustProxy: false,
            subdomainOffset: 2,
            etag: false,
          }),
        },
        database: {
          connection: 'sqlite',
          connections: {
            sqlite: {
              client: 'sqlite3',
              connection: { filename: dbPath },
              useNullAsDefault: true,
            },
          },
        },
        bodyparser: {
          allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
          json: {
            limit: '50mb',
            strict: true,
            types: [
              'application/json',
              'application/json-patch+json',
              'application/vnd.api+json',
              'application/csp-report',
            ],
            convertEmptyStringsToNull: false,
            trimWhitespaces: false,
          },
          raw: {
            types: ['text/*'],
          },
          form: {
            types: ['application/x-www-form-urlencoded'],
          },
          multipart: {
            types: ['multipart/form-data'],
            limit: '20mb',
            autoProcess: true,
            processManually: [],
            maxFields: 1000,
          },
        },
      },
    })
    .preload(async app => {
      // Runs after the providers are booted and before the server starts
      // listening, so middleware and routes are in place for the first request.
      setApp(app);
      await migrate();
      await kernel.registerKernel(app);
      await routes.registerRoutes(app);
    })
    .create(pathToFileURL(`${__dirname}/`));

  try {
    await ignitor.httpServer().start();
  } catch (error) {
    console.error(error);
    throw error;
  }
};
