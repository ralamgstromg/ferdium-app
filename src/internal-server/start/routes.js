/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Routes are registered when the app is ready (see `start.ts`). Every guard
| compares the client token with the one the Electron main process generated
| for this session.
|
*/

const { timingSafeEqual } = require('node:crypto');

const { API_VERSION } = require('../../environment-remote');
const UserController = require('../app/Controllers/Http/UserController');
const ServiceController = require('../app/Controllers/Http/ServiceController');
const WorkspaceController = require('../app/Controllers/Http/WorkspaceController');
const RecipeController = require('../app/Controllers/Http/RecipeController');
const ImageController = require('../app/Controllers/Http/ImageController');
const { renderView } = require('../app/Views');

// The router resolves `[lazy(Controller), method]` through the app container
const lazy = Controller => () => Promise.resolve({ default: Controller });

const FERDIUM_LOCAL_TOKEN_COOKIE = 'ferdium-local-token';

function isValidToken(clientToken) {
  const serverToken = process.env.FERDIUM_LOCAL_TOKEN;
  if (!serverToken || !clientToken) {
    return false;
  }

  const client = Buffer.from(clientToken, 'utf8');
  const server = Buffer.from(serverToken, 'utf8');

  // timingSafeEqual throws when the lengths differ
  return client.length === server.length && timingSafeEqual(client, server);
}

/**
 * Creates a middleware that lets the request through only when `readToken`
 * returns the session token. `requireHeader` is an extra header check.
 */
function tokenGuard(readToken, requireHeader) {
  return async ({ request, response }, next) => {
    if (requireHeader && !request.header(requireHeader)) {
      return response.forbidden();
    }

    if (!isValidToken(readToken(request))) {
      return response.forbidden();
    }

    return next();
  };
}

// Used by the Electron app's API calls: needs X-Franz-Version and the token header
const OnlyAllowFerdium = tokenGuard(
  request => request.header('X-Ferdium-Local-Token'),
  'X-Franz-Version',
);

// Used by image URLs that the renderer loads directly: token in the query string
const RequireTokenInQS = tokenGuard(request => request.qs().token);

// Used by the pages opened in the browser: token in an httpOnly cookie
const RequireAuthenticatedBrowser = tokenGuard(request =>
  request.cookie(FERDIUM_LOCAL_TOKEN_COOKIE),
);

async function registerRoutes(app) {
  const router = await app.container.make('router');
  const version = `/${API_VERSION}`;

  // Health: returning if all systems function correctly
  router
    .get('/health', ({ response }) =>
      response.send({
        api: 'success',
        db: 'success',
      }),
    )
    .use(OnlyAllowFerdium);

  // API is grouped under '/v1/' route
  router
    .group(() => {
      // User authentication
      router.post('auth/signup', [lazy(UserController), 'signup']);
      router.post('auth/login', [lazy(UserController), 'login']);

      // User info
      router.get('me', [lazy(UserController), 'me']);
      router.put('me', [lazy(UserController), 'updateMe']);

      // Service info
      router.post('service', [lazy(ServiceController), 'create']);
      router.put('service/reorder', [lazy(ServiceController), 'reorder']);
      router.put('service/:id', [lazy(ServiceController), 'edit']);
      router.delete('service/:id', [lazy(ServiceController), 'delete']);
      router.get('me/services', [lazy(ServiceController), 'list']);

      // Recipe store
      router.get('recipes', [lazy(RecipeController), 'list']);
      router.get('recipes/search', [lazy(RecipeController), 'search']);
      router.get('recipes/popular', [lazy(RecipeController), 'popularRecipes']);
      router.get('recipes/download/:recipe', [
        lazy(RecipeController),
        'download',
      ]);
      router.post('recipes/update', [lazy(RecipeController), 'update']);

      // Workspaces
      router.put('workspace/:id', [lazy(WorkspaceController), 'edit']);
      router.delete('workspace/:id', [lazy(WorkspaceController), 'delete']);
      router.post('workspace', [lazy(WorkspaceController), 'create']);
      router.get('workspace', [lazy(WorkspaceController), 'list']);
    })
    .prefix(version)
    .use(OnlyAllowFerdium);

  router
    .group(() => {
      router.get('icon/:id', [lazy(ImageController), 'icon']);
    })
    .prefix(version)
    .use(RequireTokenInQS);

  router
    .group(() => {
      // Franz account import
      router.post('import', [lazy(UserController), 'import']);
      router.get('import', renderView('import'));

      // Account transfer
      router.get('export', [lazy(UserController), 'export']);
      router.post('transfer', [lazy(UserController), 'importFerdium']);
      router.get('transfer', renderView('transfer'));

      // Index
      router.get('/', renderView('index'));
    })
    .use(RequireAuthenticatedBrowser);

  router.get('token/:token', ({ params, response }) => {
    if (!isValidToken(params.token)) {
      return response.forbidden();
    }

    response.cookie(FERDIUM_LOCAL_TOKEN_COOKIE, params.token, {
      httpOnly: true,
      sameSite: true,
      path: '/',
    });
    return response.redirect('/');
  });
}

module.exports = { registerRoutes, isValidToken };
