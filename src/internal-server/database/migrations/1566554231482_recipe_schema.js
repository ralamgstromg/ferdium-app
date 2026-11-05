const { BaseSchema } = require('@adonisjs/lucid/schema');

class RecipeSchema extends BaseSchema {
  async up() {
    this.schema.createTable('recipes', table => {
      table.increments('id');
      table.string('name', 80).notNullable();
      table.string('recipeId', 254).notNullable().unique();
      table.json('data');
      table.timestamps(true);
    });
  }

  async down() {
    this.schema.dropTable('recipes');
  }
}

module.exports = RecipeSchema;
