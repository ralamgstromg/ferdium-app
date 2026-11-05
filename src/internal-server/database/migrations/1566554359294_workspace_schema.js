const { BaseSchema } = require('@adonisjs/lucid/schema');

class WorkspaceSchema extends BaseSchema {
  async up() {
    this.schema.createTable('workspaces', table => {
      table.increments('id');
      table.string('workspaceId', 80).notNullable().unique();
      table.string('name', 80).notNullable();
      table.integer('order');
      table.json('services');
      table.json('data');
      table.timestamps(true);
    });
  }

  async down() {
    this.schema.dropTable('workspaces');
  }
}

module.exports = WorkspaceSchema;
