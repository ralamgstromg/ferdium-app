const crypto = require('node:crypto');
const { v4: uuid } = require('uuid');
const { DEFAULT_APP_SETTINGS } = require('../../../../config');
const { convertToJSON } = require('../../../../jsUtils');
const { API_VERSION } = require('../../../../environment-remote');
const { default: userAgent } = require('../../../../helpers/userAgent-helpers');
const { getDb, newUnusedId } = require('../../Database');
const { validateInput } = require('../../Validation');

async function apiRequest(url, route, method, auth) {
  const response = await fetch(`${url}/${API_VERSION}/${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${auth}`,
      'User-Agent': userAgent(),
    },
  });
  return response.json();
}

// The local server does not validate credentials: any login gets this token
const LOGIN_SUCCESS_TOKEN =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJGZXJkaSBJbnRlcm5hbCBTZXJ2ZXIiLCJpYXQiOjE1NzEwNDAyMTUsImV4cCI6MjUzMzk1NDE3ODQ0LCJhdWQiOiJnZXRmZXJkaS5jb20iLCJzdWIiOiJmZXJkaUBsb2NhbGhvc3QiLCJ1c2VySWQiOiIxIn0.9_TWFGp6HROv8Yg82Rt6i1-95jqWym40a-HmgrdMC6M';

const DEFAULT_USER_DATA = {
  accountType: 'individual',
  beta: false,
  email: '',
  emailValidated: true,
  features: {},
  firstname: 'Ferdium',
  id: '82c1cf9d-ab58-4da2-b55e-aaa41d2142d8',
  isSubscriptionOwner: true,
  lastname: 'Application',
  locale: DEFAULT_APP_SETTINGS.fallbackLocale,
};

class UserController {
  // Register a new user
  async signup({ request, response }) {
    const validation = await validateInput(vine => {
      return vine.object({
        firstname: vine.string(),
        email: vine.string().email(),
        password: vine.string(),
      });
    }, request.all());
    if (!validation.valid) {
      return response.status(401).send({
        message: 'Invalid POST arguments',
        messages: validation.messages,
        status: 401,
      });
    }

    return response.send({
      message: 'Successfully created account',
      token: LOGIN_SUCCESS_TOKEN,
    });
  }

  // Login using an existing user
  async login({ request, response }) {
    if (!request.header('Authorization')) {
      return response.status(401).send({
        message: 'Please provide authorization',
        status: 401,
      });
    }

    return response.send({
      message: 'Successfully logged in',
      token: LOGIN_SUCCESS_TOKEN,
    });
  }

  // Return information about the current user
  async me({ response }) {
    const db = await getDb();
    const user = await db.from('users').where('id', 1).first();

    const settings = convertToJSON(user.settings);

    return response.send({
      ...DEFAULT_USER_DATA,
      ...settings,
    });
  }

  async updateMe({ request, response }) {
    const db = await getDb();
    const user = await db.from('users').where('id', 1).first();

    const settings = convertToJSON(user.settings || {});

    const newSettings = {
      ...settings,
      ...request.all(),
    };

    await db
      .from('users')
      .where('id', 1)
      .update({ settings: JSON.stringify(newSettings) });

    return response.send({
      data: {
        ...DEFAULT_USER_DATA,
        ...newSettings,
      },
      status: ['data-updated'],
    });
  }

  async import({ request, response }) {
    // Validate user input
    const validation = await validateInput(vine => {
      return vine.object({
        email: vine.string().email(),
        password: vine.string(),
        server: vine.string(),
      });
    }, request.all());
    if (!validation.valid) {
      let errorMessage =
        'There was an error while trying to import your account:\n';
      for (const message of validation.messages) {
        errorMessage +=
          message.rule === 'required'
            ? `- Please make sure to supply your ${message.field}\n`
            : `${message.message}\n`;
      }
      return response.status(401).send(errorMessage);
    }

    const { email, password, server } = request.all();

    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('base64');

    // Try to get an authentication token
    let token;
    try {
      const basicToken = Buffer.from(`${email}:${hashedPassword}`).toString(
        'base64',
      );

      const rawResponse = await fetch(`${server}/${API_VERSION}/auth/login`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicToken}`,
          'User-Agent': userAgent(),
        },
      });
      const content = await rawResponse.json();

      if (!content.message || content.message !== 'Successfully logged in') {
        const errorMessage =
          'Could not login into Franz with your supplied credentials. Please check and try again';
        return response.status(401).send(errorMessage);
      }

      token = content.token;
    } catch (error) {
      return response.status(401).send({
        message: 'Cannot login to Franz',
        error: String(error),
      });
    }

    // Get user information
    let userInf = false;
    try {
      userInf = await apiRequest(server, 'me', 'GET', token);
    } catch (error) {
      const errorMessage = `Could not get your user info from Franz. Please check your credentials or try again later.\nError: ${error}`;
      return response.status(401).send(errorMessage);
    }
    if (!userInf) {
      const errorMessage =
        'Could not get your user info from Franz. Please check your credentials or try again later';
      return response.status(401).send(errorMessage);
    }

    const serviceIdTranslation = {};

    // Import services
    try {
      const services = await apiRequest(server, 'me/services', 'GET', token);

      for (const service of services) {
        // eslint-disable-next-line no-await-in-loop -- sequential writes keep the import order
        await this._createAndCacheService(service, serviceIdTranslation);
      }
    } catch (error) {
      const errorMessage = `Could not import your services into our system.\nError: ${error}`;
      return response.status(401).send(errorMessage);
    }

    // Import workspaces
    try {
      const workspaces = await apiRequest(server, 'workspace', 'GET', token);

      for (const workspace of workspaces) {
        // eslint-disable-next-line no-await-in-loop -- sequential writes keep the import order
        await this._createWorkspace(workspace, serviceIdTranslation);
      }
    } catch (error) {
      const errorMessage = `Could not import your workspaces into our system.\nError: ${error}`;
      return response.status(401).send(errorMessage);
    }

    return response.send(
      'Your account has been imported. You can now use your Franz account in Ferdium.',
    );
  }

  // Account import/export
  async export({ response }) {
    const db = await getDb();
    const services = await db.from('services');
    const workspaces = await db.from('workspaces');

    const exportData = {
      username: 'Ferdium',
      mail: 'internal@ferdium.org',
      services,
      workspaces,
    };

    return response
      .header('Content-Type', 'application/force-download')
      .header('Content-disposition', 'attachment; filename=export.ferdium-data')
      .send(exportData);
  }

  async importFerdium({ request, response }) {
    const validation = await validateInput(vine => {
      return vine.object({
        file: vine.string(),
      });
    }, request.all());
    if (!validation.valid) {
      return response.send(validation.messages);
    }

    let file;
    try {
      file = JSON.parse(request.input('file'));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      return response.send(
        'Could not import: Invalid file, could not read file',
      );
    }

    if (!file || !file.services || !file.workspaces) {
      return response.send('Could not import: Invalid file (2)');
    }

    const serviceIdTranslation = {};

    // Import services
    try {
      for (const service of file.services) {
        // eslint-disable-next-line no-await-in-loop -- sequential writes keep the import order
        await this._createAndCacheService(service, serviceIdTranslation);
      }
    } catch (error) {
      const errorMessage = `Could not import your services into our system.\nError: ${error}`;
      return response.send(errorMessage);
    }

    // Import workspaces
    try {
      for (const workspace of file.workspaces) {
        // eslint-disable-next-line no-await-in-loop -- sequential writes keep the import order
        await this._createWorkspace(workspace, serviceIdTranslation);
      }
    } catch (error) {
      const errorMessage = `Could not import your workspaces into our system.\nError: ${error}`;
      return response.status(401).send(errorMessage);
    }

    return response.send('Your account has been imported.');
  }

  async _createWorkspace(workspace, serviceIdTranslation) {
    const db = await getDb();
    const workspaceId = await newUnusedId('workspaces', 'workspaceId', uuid);

    if (workspace.services) {
      // eslint-disable-next-line no-param-reassign
      workspace.services = convertToJSON(workspace.services);
    }
    const services =
      workspace.services && typeof workspace.services === 'object'
        ? workspace.services.map(
            oldServiceId => serviceIdTranslation[oldServiceId],
          )
        : [];
    if (workspace.data) {
      // eslint-disable-next-line no-param-reassign
      workspace.data = convertToJSON(workspace.data);
    }

    await db.table('workspaces').insert({
      workspaceId,
      name: workspace.name,
      order: workspace.order,
      services: JSON.stringify(services),
      data: JSON.stringify(workspace.data || {}),
    });
  }

  async _createAndCacheService(service, serviceIdTranslation) {
    const db = await getDb();
    // Get new, unused uuid
    const newServiceId = await newUnusedId('services', 'serviceId', uuid);

    // store the old serviceId as the key for future lookup
    // eslint-disable-next-line no-param-reassign
    serviceIdTranslation[service.serviceId] = newServiceId;

    if (service.settings) {
      // eslint-disable-next-line no-param-reassign
      service.settings = convertToJSON(service.settings);
    }

    await db.table('services').insert({
      serviceId: newServiceId,
      name: service.name,
      recipeId: service.recipeId,
      settings: JSON.stringify(service.settings || {}),
    });
  }
}

module.exports = UserController;
