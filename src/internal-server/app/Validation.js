/**
 * Input validation with VineJS (replaces the AdonisJS 5 `validateAll` helper).
 *
 * `buildSchema` receives the `vine` builder and returns a schema.
 * Returns `{ valid: true, data }` or `{ valid: false, messages }`, where
 * `messages` is `[{ field, rule, message }]`.
 */
const vine = require('@vinejs/vine').default;

async function validateInput(buildSchema, data) {
  try {
    const validated = await vine.create(buildSchema(vine)).validate(data || {});
    return { valid: true, data: validated };
  } catch (error) {
    if (error && error.code === 'E_VALIDATION_ERROR') {
      return { valid: false, messages: error.messages };
    }
    throw error;
  }
}

module.exports = { validateInput };
