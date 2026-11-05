const { convertToJSON } = require('../../jsUtils');
const { ferdiumVersion } = require('../../environment-remote');
const { getDb } = require('../app/Database');

/**
 * Migrate server database to work with current Ferdium version
 */

const migrateLog = text => {
  // eslint-disable-next-line no-console
  console.log('\u001B[36m%s\u001B[0m', 'Ferdium Migration:', '\u001B[0m', text);
};

async function migrate() {
  const db = await getDb();

  migrateLog('🧙‍  Running database migration wizard');

  // Make sure user table exists
  await db.rawQuery(
    'CREATE TABLE IF NOT EXISTS `users` (`id` integer not null primary key autoincrement, `settings` text, `created_at` datetime, `updated_at` datetime);',
  );

  const user = await db.from('users').where('id', 1).first();
  let settings;
  if (user) {
    settings = convertToJSON(user.settings);
  } else {
    migrateLog("🎩  Migrating from old Ferdium version as user doesn't exist");

    // Create new user
    await db.rawQuery('INSERT INTO "users" ("id") VALUES (\'1\');');
  }

  if (
    !settings ||
    !settings.db_version ||
    settings.db_version !== ferdiumVersion
  ) {
    const srcVersion = settings?.db_version || '5.4.0-beta.2';
    migrateLog(`🔮  Migrating table from ${srcVersion} to ${ferdiumVersion}`);

    // Migrate database to current Ferdium version
    // Currently no migrations

    // Update version number in database
    if (!settings) settings = {};
    settings.db_version = ferdiumVersion;
    await db
      .from('users')
      .where('id', 1)
      .update({ settings: JSON.stringify(settings) });
  } else {
    migrateLog('🔧  Nothing to migrate, already on the newest version');
  }
}

module.exports = { migrate };
