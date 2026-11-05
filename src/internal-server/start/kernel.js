/*
|--------------------------------------------------------------------------
| Kernel
|--------------------------------------------------------------------------
|
| Global middleware. Router middleware runs only when a route matches, server
| middleware runs for every request (static files need this).
|
*/

const {
  BodyParserMiddleware,
} = require('@adonisjs/bodyparser/bodyparser_middleware');
const ConvertEmptyStringsToNull = require('../app/Middleware/ConvertEmptyStringsToNull');
const StaticFiles = require('../app/Middleware/StaticFiles');

// Global middleware is passed as lazy imports (`() => ({ default: Class })`)
const lazy = Middleware => () => Promise.resolve({ default: Middleware });

async function registerKernel(app) {
  const router = await app.container.make('router');
  const server = await app.container.make('server');

  router.use([lazy(BodyParserMiddleware), lazy(ConvertEmptyStringsToNull)]);
  server.use([lazy(StaticFiles)]);
}

module.exports = { registerKernel };
