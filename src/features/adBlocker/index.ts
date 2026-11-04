import { ipcRenderer } from 'electron';
import { autorun } from 'mobx';
import type { Actions } from '../../actions/lib/actions';

const debug = require('../../preload-safe-debug')('Ferdium:feature:adBlocker');

// After the blocklist is updated, wait a moment and reload the services that
// use the blocker, so pages loaded before it was applied are filtered too.
const RELOAD_DELAY_MS = 5000;

type AdBlockerService = { id: string; isAdBlockerEnabled: boolean };

export default function init(
  stores: { services: { enabled: any } },
  actions: Actions,
) {
  debug('Initializing `adBlocker` feature');

  let isInitialSyncDone = false;

  autorun(() => {
    const services = stores.services.enabled as AdBlockerService[];
    const requests = services.map(service =>
      ipcRenderer.invoke('set-service-adblock', {
        serviceId: service.id,
        enabled: service.isAdBlockerEnabled,
      }),
    );

    // The service list loads asynchronously, so the first runs can be empty.
    if (isInitialSyncDone || services.length === 0) {
      return;
    }
    isInitialSyncDone = true;

    const serviceIds = services
      .filter(service => service.isAdBlockerEnabled)
      .map(service => service.id);

    Promise.allSettled(requests).then(() => {
      setTimeout(() => {
        for (const serviceId of serviceIds) {
          debug(`Reloading service ${serviceId} after blocklist update`);
          actions.service.reload({ serviceId });
        }
      }, RELOAD_DELAY_MS);
    });
  });
}
