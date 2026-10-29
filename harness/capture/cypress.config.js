/**
 * Cypress configuration for the Console ancestor-chain capture. Run through `yarn harness:capture`
 * against a live Console, normally the one started by start-console.sh. It is separate from
 * harness/cypress.config.js, which serves the built scenarios, and is never run in CI.
 *
 * Environment:
 *   CAPTURE_BASE_URL  Console URL. Defaults to http://localhost:9000. Anything other than a loopback
 *                     address must use https.
 *   CONSOLE_IMAGE     Recorded in the capture. Set it to the image start-console.sh ran.
 */
const fs = require('fs');
const path = require('path');
const { defineConfig } = require('cypress');

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const FIXTURE = path.join(__dirname, '../shell/fixtures/ancestor-chain.json');
const SDK_PACKAGE = path.join(__dirname, '../../node_modules/@openshift-console/dynamic-plugin-sdk/package.json');

/**
 * Returns the validated Console base URL, rejecting plain http to a non-loopback host.
 */
function baseUrl() {
  const url = new URL(process.env.CAPTURE_BASE_URL || 'http://localhost:9000');
  if (url.protocol !== 'https:' && !LOOPBACK_HOSTS.includes(url.hostname)) {
    throw new Error(`CAPTURE_BASE_URL must use https unless it targets localhost, got ${url.origin}`);
  }
  return url.origin;
}

module.exports = defineConfig({
  video: false,
  screenshotsFolder: path.join(__dirname, '../.out/capture-screenshots'),
  defaultCommandTimeout: 60000,
  e2e: {
    specPattern: '*.cy.ts',
    supportFile: false,
    setupNodeEvents(on, config) {
      config.baseUrl = baseUrl();
      on('task', {
        context() {
          return {
            consoleImage: process.env.CONSOLE_IMAGE || null,
            sdkVersion: JSON.parse(fs.readFileSync(SDK_PACKAGE, 'utf8')).version,
            cryostatNamespace: process.env.CAPTURE_CRYOSTAT_NAMESPACE || null,
            cryostatName: process.env.CAPTURE_CRYOSTAT_NAME || null,
            pagePath: process.env.CAPTURE_PATH || '/cryostat/',
          };
        },
        writeCapture(capture) {
          fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
          fs.writeFileSync(FIXTURE, `${JSON.stringify(capture, null, 2)}\n`);
          return null;
        },
      });
      return config;
    },
  },
});
