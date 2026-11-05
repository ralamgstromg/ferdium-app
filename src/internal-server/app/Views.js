/**
 * Edge templates for the pages opened in the browser (index, import, transfer).
 */
const path = require('node:path');
const { Edge } = require('edge.js');

const edge = Edge.create();
edge.mount(path.join(__dirname, '..', 'resources', 'views'));

// Stylesheet tag. Files are served from `public/css` (see `StaticFiles`).
edge.global('style', name => `<link rel="stylesheet" href="/${name}.css">`);

/**
 * Returns a route handler that renders `template` as HTML.
 */
const renderView =
  template =>
  async ({ response }) => {
    const html = await edge.render(template);
    return response.type('text/html').send(html);
  };

module.exports = { renderView };
