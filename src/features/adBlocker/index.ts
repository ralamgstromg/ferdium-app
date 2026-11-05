import { ipcRenderer } from 'electron';
import { autorun } from 'mobx';

const debug = require('../../preload-safe-debug')('Ferdium:feature:adBlocker');

type AdBlockerService = { id: string; isAdBlockerEnabled: boolean };

// Keeps each service's session in step with its setting. The main process holds
// requests until the lists are ready, so pages need no reload after the sync.
export default function init(stores: { services: { enabled: any } }) {
  debug('Initializing `adBlocker` feature');

  autorun(() => {
    const services = stores.services.enabled as AdBlockerService[];
    for (const service of services) {
      ipcRenderer.invoke('set-service-adblock', {
        serviceId: service.id,
        enabled: service.isAdBlockerEnabled,
      });
    }
  });
}
