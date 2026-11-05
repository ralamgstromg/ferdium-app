import { ipcRenderer } from 'electron';
import { useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Button from '../../ui/button';

const messages = defineMessages({
  description: {
    id: 'settings.app.extensions.description',
    defaultMessage:
      'Unpacked Chrome extensions (a folder with manifest.json) are loaded into every service. Extensions can read the pages of your services.',
  },
  add: {
    id: 'settings.app.extensions.add',
    defaultMessage: 'Add extension folder',
  },
  remove: {
    id: 'settings.app.extensions.remove',
    defaultMessage: 'Remove',
  },
  empty: {
    id: 'settings.app.extensions.empty',
    defaultMessage: 'No extensions added.',
  },
  addFailed: {
    id: 'settings.app.extensions.addFailed',
    defaultMessage: 'That folder does not contain a valid extension.',
  },
});

// Mirrors ExtensionInfo in src/electron/extensions.ts.
type ExtensionInfo = { folder: string; name: string; version: string };

const ExtensionsSettings = () => {
  const intl = useIntl();
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
  const [error, setError] = useState('');

  const refresh = async () => {
    setExtensions(await ipcRenderer.invoke('extensions-list'));
  };

  useEffect(() => {
    ipcRenderer.invoke('extensions-list').then(setExtensions);
  }, []);

  const add = async () => {
    setError('');
    try {
      const added = await ipcRenderer.invoke('extensions-add');
      if (added) {
        await refresh();
      }
    } catch {
      setError(intl.formatMessage(messages.addFailed));
    }
  };

  const remove = async (folder: string) => {
    await ipcRenderer.invoke('extensions-remove', folder);
    await refresh();
  };

  return (
    <div className="settings__settings-group">
      <p className="settings__help indented__help">
        {intl.formatMessage(messages.description)}
      </p>
      {extensions.length === 0 && (
        <p className="settings__help indented__help">
          {intl.formatMessage(messages.empty)}
        </p>
      )}
      {extensions.map(extension => (
        <div key={extension.folder} className="settings__extension">
          <strong>
            {extension.name}
            {extension.version && ` ${extension.version}`}
          </strong>
          <span className="settings__help">{extension.folder}</span>
          <Button
            label={intl.formatMessage(messages.remove)}
            onClick={() => remove(extension.folder)}
          />
        </div>
      ))}
      <Button label={intl.formatMessage(messages.add)} onClick={() => add()} />
      {error && <p className="settings__help indented__help">{error}</p>}
    </div>
  );
};

export default ExtensionsSettings;
