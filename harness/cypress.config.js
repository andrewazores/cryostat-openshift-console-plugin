/**
 * Cypress configuration for the Console component harness. Separate from cypress/cypress.config.js,
 * which drives end-to-end tests against a live Console.
 *
 * Serves harness/.out (see build.js) from an ephemeral local port and points baseUrl at it, so no
 * Console, cluster or plugin build is needed. Run through `yarn harness`.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { defineConfig } = require('cypress');

const outDir = path.join(__dirname, '.out');

const contentTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/**
 * Starts a static file server for the built scenarios, bound to the loopback interface only.
 * Resolves with the base URL once the server is listening.
 */
function serve() {
  const server = http.createServer((req, res) => {
    const requested = path.normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    const file = path.join(outDir, requested);
    if (!file.startsWith(outDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  server.unref();
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

module.exports = defineConfig({
  viewportWidth: 1500,
  viewportHeight: 900,
  screenshotsFolder: path.join(outDir, 'screenshots'),
  video: false,
  e2e: {
    specPattern: 'specs/**/*.cy.ts',
    supportFile: false,
    async setupNodeEvents(on, config) {
      config.baseUrl = await serve();
      return config;
    },
  },
});
