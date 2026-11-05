const { v4: uuid } = require('uuid');
const {
  DEFAULT_SERVICE_ORDER,
  DEFAULT_SERVICE_SETTINGS,
} = require('../../../../config');
const { convertToJSON } = require('../../../../jsUtils');
const { deduceIconUrl, moveIcon } = require('../../ImageHelper');
const { getDb, newUnusedId } = require('../../Database');
const { validateInput } = require('../../Validation');

/**
 * Converts a `services` row to the shape the Ferdium client expects.
 * `hasCustomIconDefault` keeps the default that each endpoint used before.
 */
function toClientService(service, hasCustomIconDefault) {
  const settings = convertToJSON(service.settings);

  return {
    customRecipe: false,
    hasCustomIcon: hasCustomIconDefault,
    isBadgeEnabled: DEFAULT_SERVICE_SETTINGS.isBadgeEnabled,
    trapLinkClicks: DEFAULT_SERVICE_SETTINGS.trapLinkClicks,
    isAdBlockerEnabled: DEFAULT_SERVICE_SETTINGS.isAdBlockerEnabled,
    useFavicon: DEFAULT_SERVICE_SETTINGS.useFavicon,
    isDarkModeEnabled: '', // TODO: This should ideally be a boolean (false). But, changing it caused the sidebar toggle to not work.
    isProgressbarEnabled: DEFAULT_SERVICE_SETTINGS.isProgressbarEnabled,
    isEnabled: DEFAULT_SERVICE_SETTINGS.isEnabled,
    isMuted: DEFAULT_SERVICE_SETTINGS.isMuted,
    isNotificationEnabled: DEFAULT_SERVICE_SETTINGS.isNotificationEnabled,
    order: DEFAULT_SERVICE_ORDER,
    spellcheckerLanguage: '',
    workspaces: [],
    // Overwrite previous default settings with what's obtained from the db
    ...settings,
    // Overwrite even after the spread operator with specific values
    iconUrl: deduceIconUrl(settings.iconId),
    id: service.serviceId,
    name: service.name,
    recipeId: service.recipeId,
    userId: 1,
  };
}

class ServiceController {
  // Create a new service for user
  async create({ request, response }) {
    const data = request.all();

    // Validate user input
    const validation = await validateInput(vine => {
      return vine.object({
        name: vine.string(),
        recipeId: vine.string(),
      });
    }, data);
    if (!validation.valid) {
      return response.status(401).send({
        message: 'Invalid POST arguments',
        messages: validation.messages,
        status: 401,
      });
    }

    const db = await getDb();
    const serviceId = await newUnusedId('services', 'serviceId', uuid);

    await db.table('services').insert({
      serviceId,
      name: data.name,
      recipeId: data.recipeId,
      settings: JSON.stringify(data),
    });

    // TODO: Remove duplication
    return response.send({
      data: {
        userId: 1,
        id: serviceId,
        isEnabled: DEFAULT_SERVICE_SETTINGS.isEnabled,
        isNotificationEnabled: DEFAULT_SERVICE_SETTINGS.isNotificationEnabled,
        isBadgeEnabled: DEFAULT_SERVICE_SETTINGS.isBadgeEnabled,
        trapLinkClicks: DEFAULT_SERVICE_SETTINGS.trapLinkClicks,
        isAdBlockerEnabled: DEFAULT_SERVICE_SETTINGS.isAdBlockerEnabled,
        useFavicon: DEFAULT_SERVICE_SETTINGS.useFavicon,
        isMuted: DEFAULT_SERVICE_SETTINGS.isMuted,
        isDarkModeEnabled: '', // TODO: This should ideally be a boolean (false). But, changing it caused the sidebar toggle to not work.
        isProgressbarEnabled: DEFAULT_SERVICE_SETTINGS.isProgressbarEnabled,
        spellcheckerLanguage: '',
        order: DEFAULT_SERVICE_ORDER,
        customRecipe: false,
        hasCustomIcon: DEFAULT_SERVICE_SETTINGS.customIcon,
        workspaces: [],
        iconUrl: null,
        // Overwrite previous default settings with what's obtained from the request
        ...data,
      },
      status: ['created'],
    });
  }

  // List all services a user has created
  async list({ response }) {
    const db = await getDb();
    const services = await db.from('services');

    return response.send(
      services.map(service =>
        toClientService(service, DEFAULT_SERVICE_SETTINGS.hasCustomIcon),
      ),
    );
  }

  async edit({ request, response, params }) {
    const db = await getDb();

    // Upload custom service icon if present
    const icon = request.file('icon', {
      extnames: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'webp'],
      size: '2mb',
    });
    if (icon) {
      const { id } = params;
      const service = await db.from('services').where('serviceId', id).first();
      const settings = convertToJSON(service.settings);

      const iconId = await moveIcon(icon);
      if (iconId === '-1') {
        return response.status(500).send(icon.errors);
      }

      const newSettings = {
        ...settings,
        iconId,
        customIconVersion: settings?.customIconVersion
          ? settings.customIconVersion + 1
          : 1,
      };

      // Update data in database
      await db
        .from('services')
        .where('serviceId', id)
        .update({
          name: service.name,
          settings: JSON.stringify(newSettings),
        });

      return response.send({
        data: {
          id,
          name: service.name,
          ...newSettings,
          iconUrl: deduceIconUrl(newSettings.iconId),
          userId: 1,
        },
        status: ['updated'],
      });
    }

    // Update service info
    const data = request.all();
    const { id } = params;

    // Get current settings from db
    const serviceData = await db
      .from('services')
      .where('serviceId', id)
      .first();

    if (data.customIcon === 'delete') {
      data.iconId = '';
    }

    const settings = {
      ...convertToJSON(serviceData.settings),
      ...data,
    };

    // Update data in database
    await db
      .from('services')
      .where('serviceId', id)
      .update({
        name: data.name,
        settings: JSON.stringify(settings),
      });

    // Get updated row
    const service = await db.from('services').where('serviceId', id).first();

    return response.send({
      data: {
        id,
        name: service.name,
        ...settings,
        iconUrl: deduceIconUrl(settings.iconId),
        userId: 1,
      },
      status: ['updated'],
    });
  }

  async reorder({ request, response }) {
    const db = await getDb();
    const data = request.all();

    for (const service of Object.keys(data)) {
      // Get current settings from db
      // eslint-disable-next-line no-await-in-loop -- sequential writes keep the import order
      const serviceData = await db
        .from('services')
        .where('serviceId', service)
        .first();

      const settings = {
        ...convertToJSON(serviceData.settings),
        order: data[service],
      };

      // Update data in database
      // eslint-disable-next-line no-await-in-loop -- sequential writes keep the import order
      await db
        .from('services')
        .where('serviceId', service)
        .update({
          settings: JSON.stringify(settings),
        });
    }

    // Get new services
    const services = await db.from('services');

    return response.send(
      services.map(service =>
        toClientService(service, DEFAULT_SERVICE_SETTINGS.customIcon),
      ),
    );
  }

  async delete({ params, response }) {
    const db = await getDb();

    // Update data in database
    await db.from('services').where('serviceId', params.id).delete();

    return response.send({
      message: 'Sucessfully deleted service',
      status: 200,
    });
  }
}

module.exports = ServiceController;
