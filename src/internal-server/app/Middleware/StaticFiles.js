/**
 * Serves files from the `public` folder for GET and HEAD requests.
 *
 * Only the known asset folders are exposed, and the resolved path must stay
 * inside `public`. Dotfiles are never served.
 */
const { createReadStream, promises: fsp } = require('node:fs');
const path = require('node:path');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const ASSET_PREFIXES = ['/css/', '/js/', '/images/'];

const MIME_TYPES = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

class StaticFiles {
  async handle(ctx, next) {
    const { request, response } = ctx;
    const isRead = request.method() === 'GET' || request.method() === 'HEAD';
    const url = request.url();

    if (!isRead || !ASSET_PREFIXES.some(prefix => url.startsWith(prefix))) {
      return next();
    }

    const relativePath = decodeURIComponent(url.split('?')[0]);
    const filePath = path.normalize(path.join(PUBLIC_DIR, relativePath));
    const insidePublic = filePath.startsWith(PUBLIC_DIR + path.sep);
    const isDotfile = path.basename(filePath).startsWith('.');

    if (!insidePublic || isDotfile) {
      return next();
    }

    try {
      const stats = await fsp.stat(filePath);
      if (!stats.isFile()) {
        return next();
      }
    } catch {
      return next();
    }

    response.type(
      MIME_TYPES[path.extname(filePath)] || 'application/octet-stream',
    );
    return response.stream(createReadStream(filePath));
  }
}

module.exports = StaticFiles;
