/**
 * Builds every scenario in harness/scenarios into harness/.out, together with the Monaco workers, the
 * stylesheets under test, and one HTML page per scenario that wraps the scenario in the Console shell.
 *
 * This bypasses the plugin's webpack build on purpose: esbuild bundles a scenario in about a second.
 * The trade-off is that webpack-only behaviour (module federation, $codeRef, MonacoWebpackPlugin)
 * is not exercised here.
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const webRoot = path.join(root, 'src/cryostat-web');
const outDir = path.join(__dirname, '.out');
const scenariosDir = path.join(__dirname, 'scenarios');

/**
 * Returns the first existing candidate path, mirroring the resolution in webpack.config.ts so that
 * the harness bundles the same Monaco copy that cryostat-web imports.
 */
function firstExisting(candidates) {
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`None of these paths exist: ${candidates.join(', ')}`);
  }
  return found;
}

const monacoPath = firstExisting([
  path.join(webRoot, 'node_modules/monaco-editor'),
  path.join(root, 'node_modules/monaco-editor'),
]);

const stylesheets = {
  'pf-base.css': firstExisting([
    path.join(root, 'node_modules/@patternfly/patternfly/patternfly-base.css'),
    path.join(webRoot, 'node_modules/@patternfly/patternfly/patternfly-base.css'),
  ]),
  'app.css': path.join(webRoot, 'src/app/app.css'),
  'plugin.css': path.join(root, 'src/openshift/styles/plugin.css'),
  'console-shell.css': path.join(__dirname, 'shell/console-shell.css'),
};

/**
 * Renders the page that hosts a scenario. Appending ?plugin-css=off to the URL omits plugin.css, which
 * reproduces how a component behaves in the Console without the plugin's overrides.
 */
function page(name) {
  return `<!doctype html>
<html class="pf-v6-theme-light">
  <head>
    <meta charset="utf-8" />
    <title>${name}</title>
    <link rel="stylesheet" href="pf-base.css" />
    <link rel="stylesheet" href="${name}.css" />
    <link rel="stylesheet" href="console-shell.css" />
    <script>
      const pluginCss = new URLSearchParams(location.search).get('plugin-css') !== 'off';
      document.write('<link rel="stylesheet" href="app.css" />');
      if (pluginCss) {
        document.write('<link rel="stylesheet" href="plugin.css" />');
      }
    </script>
  </head>
  <body>
    <div id="console"><div id="route"></div></div>
    <script type="module" src="${name}.js"></script>
  </body>
</html>
`;
}

async function build() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const scenarios = fs
    .readdirSync(scenariosDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => path.basename(file, '.tsx'));

  if (scenarios.length === 0) {
    throw new Error(`No scenarios found in ${scenariosDir}`);
  }

  const common = {
    bundle: true,
    format: 'esm',
    outdir: outDir,
    logLevel: 'warning',
    nodePaths: [path.join(root, 'node_modules'), path.join(webRoot, 'node_modules')],
  };

  await esbuild.build({
    ...common,
    entryPoints: Object.fromEntries(scenarios.map((name) => [name, path.join(scenariosDir, `${name}.tsx`)])),
    jsx: 'automatic',
    alias: { 'monaco-editor': monacoPath },
    loader: { '.ttf': 'file', '.woff': 'file', '.woff2': 'file', '.svg': 'file', '.png': 'file' },
  });

  await esbuild.build({
    ...common,
    entryPoints: {
      'editor.worker': path.join(monacoPath, 'esm/vs/editor/editor.worker.js'),
      'json.worker': path.join(monacoPath, 'esm/vs/language/json/json.worker.js'),
    },
  });

  Object.entries(stylesheets).forEach(([name, source]) => fs.copyFileSync(source, path.join(outDir, name)));
  scenarios.forEach((name) => fs.writeFileSync(path.join(outDir, `${name}.html`), page(name)));

  console.log(`Built ${scenarios.length} scenario(s) into ${path.relative(root, outDir)}: ${scenarios.join(', ')}`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
