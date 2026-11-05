/**
 * Access to the Lucid query builder.
 *
 * The app container is passed in once, from the preload in `start.ts`. The
 * `db` service module sets its value in its own `booted` hook, which can run
 * after the code that needs it, so the container is used instead.
 */
let app;

function setApp(appInstance) {
  app = appInstance;
}

async function getDb() {
  if (!app) {
    throw new Error('Internal server database used before the app was ready');
  }
  return app.container.make('lucid.db');
}

/**
 * Returns a uuid that is not yet used in `column` of `table`.
 */
async function newUnusedId(table, column, uuid) {
  const db = await getDb();
  let id;
  do {
    id = uuid();
    // eslint-disable-next-line no-await-in-loop -- each candidate id is checked in turn
  } while (await db.from(table).where(column, id).first());
  return id;
}

module.exports = { setApp, getDb, newUnusedId };
