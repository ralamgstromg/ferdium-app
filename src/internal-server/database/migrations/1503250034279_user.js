const { BaseSchema } = require('@adonisjs/lucid/schema');

class UserSchema extends BaseSchema {
  async up() {
    this.schema.createTable('users', table => {
      table.increments('id');
      table.json('settings');
      table.timestamps(true);
    });
  }

  async down() {
    this.schema.dropTable('users');
  }
}

module.exports = UserSchema;
