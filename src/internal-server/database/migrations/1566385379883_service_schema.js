const { BaseSchema } = require('@adonisjs/lucid/schema');

class ServiceSchema extends BaseSchema {
  async up() {
    this.schema.createTable('services', table => {
      table.increments('id');
      table.string('serviceId', 80).notNullable();
      table.string('name', 80).notNullable();
      table.string('recipeId', 254).notNullable();
      table.json('settings');
      table.timestamps(true);
    });
  }

  async down() {
    this.schema.dropTable('services');
  }
}

module.exports = ServiceSchema;
