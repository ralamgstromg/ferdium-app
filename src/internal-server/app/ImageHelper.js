const path = require('node:path');
const { v4: uuid } = require('uuid');

const fs = require('fs-extra');
const { API_VERSION } = require('../../environment-remote');

/**
 * Stores an uploaded icon in the user's `icons` folder.
 * Returns the stored file name, or '-1' when the upload is invalid or fails.
 */
const moveIcon = async icon => {
  if (!icon.isValid) {
    return '-1';
  }

  const iconsPath = path.join(process.env.USER_PATH, 'icons');
  await fs.ensureDir(iconsPath);

  // Generate new icon ID
  let iconId;
  do {
    iconId = uuid() + uuid();
  } while (fs.existsSync(path.join(iconsPath, iconId)));
  iconId = `${iconId}.${icon.extname}`;

  try {
    await icon.move(iconsPath, {
      name: iconId,
      overwrite: true,
    });
  } catch {
    return '-1';
  }
  return icon.state === 'moved' ? iconId : '-1';
};

const deduceIconUrl = iconId =>
  iconId
    ? `http://${process.env.HOST}:${process.env.PORT}/${API_VERSION}/icon/${iconId}`
    : null;

module.exports = { moveIcon, deduceIconUrl };
