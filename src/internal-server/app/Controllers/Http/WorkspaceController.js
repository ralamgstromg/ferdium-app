const { v4: uuid } = require('uuid');
const { convertToJSON } = require('../../../../jsUtils');
const { getDb, newUnusedId } = require('../../Database');
const { validateInput } = require('../../Validation');

class WorkspaceController {
  // Create a new workspace for user
  async create({ request, response }) {
    // Validate user input
    const validation = await validateInput(vine => {
      return vine.object({
        name: vine.string(),
      });
    }, request.all());
    if (!validation.valid) {
      return response.status(401).send({
        message: 'Invalid POST arguments',
        messages: validation.messages,
        status: 401,
      });
    }

    const db = await getDb();
    const data = request.all();

    const workspaceId = await newUnusedId('workspaces', 'workspaceId', uuid);

    const existing = await db.from('workspaces');
    const order = existing.length;
    const { name } = data;
    delete data.name;

    await db.table('workspaces').insert({
      workspaceId,
      name,
      order,
      services: JSON.stringify([]),
      data: JSON.stringify(data),
    });

    return response.send({
      userId: 1,
      name,
      id: workspaceId,
      order,
      workspaces: [],
    });
  }

  async edit({ request, response, params }) {
    // Validate user input
    const validation = await validateInput(vine => {
      return vine.object({
        name: vine.string(),
      });
    }, request.all());
    if (!validation.valid) {
      return response.status(401).send({
        message: 'Invalid POST arguments',
        messages: validation.messages,
        status: 401,
      });
    }

    const db = await getDb();
    const data = request.all();
    const { id } = params;

    // Update data in database
    await db
      .from('workspaces')
      .where('workspaceId', id)
      .update({
        name: data.name,
        services: JSON.stringify(data.services),
      });

    // Get updated row
    const workspace = await db
      .from('workspaces')
      .where('workspaceId', id)
      .first();

    return response.send({
      id: workspace.workspaceId,
      name: data.name,
      order: workspace.order,
      services: data.services,
      userId: 1,
    });
  }

  async delete({ response, params }) {
    // Validate user input
    const validation = await validateInput(vine => {
      return vine.object({
        id: vine.string(),
      });
    }, params);
    if (!validation.valid) {
      return response.status(401).send({
        message: 'Invalid arguments',
        messages: validation.messages,
        status: 401,
      });
    }

    const db = await getDb();
    const { id } = params;

    // Update data in database
    await db.from('workspaces').where('workspaceId', id).delete();

    return response.send({
      message: 'Successfully deleted workspace',
    });
  }

  // List all workspaces a user has created
  async list({ response }) {
    const db = await getDb();
    const workspaces = await db.from('workspaces');

    return response.send(
      workspaces.map(workspace => ({
        id: workspace.workspaceId,
        name: workspace.name,
        order: workspace.order,
        services: convertToJSON(workspace.services),
        userId: 1,
      })),
    );
  }
}

module.exports = WorkspaceController;
