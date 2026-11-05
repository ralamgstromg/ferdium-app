const fs = require('node:fs/promises');
const path = require('node:path');

const debug = require('../../../../preload-safe-debug')(
  'Ferdium:internalServer:RecipeController',
);
const { LIVE_FERDIUM_API } = require('../../../../config');
const { convertToJSON } = require('../../../../jsUtils');
const { API_VERSION } = require('../../../../environment-remote');
const { getDb } = require('../../Database');
const { validateInput } = require('../../Validation');

const RECIPES_URL = `${LIVE_FERDIUM_API}/${API_VERSION}/recipes`;

// Downloaded recipe packages (same folder the Adonis 5 drive used)
const RECIPES_DIR = path.join(__dirname, '..', '..', '..', 'recipes');

const toRecipe = recipe => ({
  id: recipe.recipeId,
  name: recipe.name,
  ...convertToJSON(recipe.data),
});

const toRecipes = rows => rows.map(recipe => toRecipe(recipe));

class RecipeController {
  // List official and custom recipes
  async list({ response }) {
    const db = await getDb();
    const recipesUrlFetch = await fetch(RECIPES_URL);
    const officialRecipes = convertToJSON(await recipesUrlFetch.text());
    const customRecipes = toRecipes(await db.from('recipes'));

    const recipes = [...officialRecipes, ...customRecipes];

    return response.send(recipes);
  }

  // Search official and custom recipes
  async search({ request, response }) {
    // Validate user input
    const validation = await validateInput(vine => {
      return vine.object({
        needle: vine.string(),
      });
    }, request.all());
    if (!validation.valid) {
      return response.status(401).send({
        message: 'Please provide a needle',
        messages: validation.messages,
        status: 401,
      });
    }

    const db = await getDb();
    const needle = request.input('needle');

    // Get results
    let results;

    if (needle === 'ferdium:custom') {
      results = toRecipes(await db.from('recipes'));
    } else {
      let remoteResults = [];

      if (process.env.CONNECT_WITH_FRANZ === 'true') {
        const recipesUrlFetch = await fetch(
          `${RECIPES_URL}/search?needle=${encodeURIComponent(needle)}`,
        );
        remoteResults = convertToJSON(await recipesUrlFetch.text());
      }

      debug('remoteResults:', remoteResults);

      const localRows = await db
        .from('recipes')
        .where('name', 'LIKE', `%${needle}%`);
      const localResults = toRecipes(localRows);

      debug('localResults:', localResults);

      results = [...localResults, ...(remoteResults || [])];
    }

    return response.send(results);
  }

  // Return an empty array
  update({ response }) {
    return response.send([]);
  }

  async popularRecipes({ response }) {
    const recipesUrlFetch = await fetch(`${RECIPES_URL}/popular`);
    const featuredRecipes = convertToJSON(await recipesUrlFetch.text());
    return response.send(featuredRecipes);
  }

  // Download a recipe
  async download({ response, params }) {
    // Validate user input
    const validation = await validateInput(vine => {
      return vine.object({
        recipe: vine.string(),
      });
    }, params);
    if (!validation.valid) {
      return response.status(401).send({
        message: 'Please provide a recipe ID',
        messages: validation.messages,
        status: 401,
      });
    }

    const service = params.recipe;

    // Check for invalid characters
    if (/\.+/.test(service) || /\/+/.test(service)) {
      return response.send('Invalid recipe name');
    }

    // Check if recipe exists in recipes folder
    const packagePath = path.join(RECIPES_DIR, `${service}.tar.gz`);
    try {
      return response.send(await fs.readFile(packagePath));
    } catch {
      // Not stored locally: fall through to the remote lookup
    }

    if (process.env.CONNECT_WITH_FRANZ === 'true') {
      return response.redirect(`${RECIPES_URL}/download/${service}`);
    }
    return response.status(400).send({
      message: 'Recipe not found',
      code: 'recipe-not-found',
    });
  }
}

module.exports = RecipeController;
