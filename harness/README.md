# Console component harness

A developer tool for reproducing OpenShift Console layout and CSS, without a cluster, a Console,
or the plugin's webpack build.

## Running

```sh
env -u ELECTRON_RUN_AS_NODE yarn harness        # build and run all specs headless
env -u ELECTRON_RUN_AS_NODE yarn harness:open   # build and open the Cypress runner
yarn harness:build                              # build only, output in harness/.out
```

`env -u ELECTRON_RUN_AS_NODE` is only needed if that variable is set in your shell (some IDE
terminals set it). While it is set, Cypress's Electron binary starts as plain Node and fails with
`bad option: --no-sandbox`.

Screenshots are written to `harness/.out/screenshots/`.

## Layout

| Path                      | Purpose                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `build.js`                | esbuild: bundles each scenario and the Monaco workers, copies the stylesheets under test, writes one HTML page per scenario |
| `cypress.config.js`       | Cypress config. Serves `.out` on an ephemeral loopback port; unrelated to `cypress/cypress.config.js`                       |
| `shell/console-shell.css` | The imitation Console content area                                                                                          |
| `lib/monaco.ts`           | Wires Monaco's workers for scenarios that use an editor                                                                     |
| `scenarios/*.tsx`         | One bundle per file. Renders a component inside the shell                                                                   |
| `specs/*.cy.ts`           | Cypress specs that visit a scenario page and assert on layout                                                               |
| `tsconfig.json`           | Type-checks the harness: `npx tsc --noEmit -p harness/tsconfig.json`                                                        |

The real `app.css` (cryostat-web) and `plugin.css` are copied into `.out` on every build, so a
change to `src/openshift/styles/plugin.css` is picked up on the next run.

Appending `?plugin-css=off` to a scenario URL omits `plugin.css`. A spec can then assert that a bug
reproduces without the plugin's override, which shows the spec can fail.

## Adding a scenario

1. Add `scenarios/<name>.tsx`. Render into `#route`; wrap in `<div className="cryostat-app">`
   so that the `.cryostat-app …` selectors in `plugin.css` match; call `configureMonaco()` if the
   scenario uses an editor.
2. Add `specs/<name>.cy.ts` that visits `/<name>.html`.
3. Write an assertion that fails without the fix. Check it by running against the commit before the
   fix, and with `?plugin-css=off`.

## Limitations

- **The shell is a guess.** `console-shell.css` is a fixed-height flex column that scrolls. It has
  not been compared with a real Console, and the Console's own stylesheet is not loaded. A passing
  result means "reproduced in the harness", not "verified in the Console". Capturing the Console
  stylesheet is a planned follow-up.
- **Scenarios replicate components structurally.** They use the real PatternFly components but not the
  real `cryostat-web` components, which need Cryostat services and a Redux store.
- **esbuild is not webpack.** Module federation, `$codeRef` resolution, and `MonacoWebpackPlugin`
  are not exercised, so the harness cannot catch a missing Monaco worker in the plugin build.
- **Linting.** `yarn eslint:check` covers `harness/` through a dedicated block in
  `eslint.config.js` that points the parser at `harness/tsconfig.json`. The root `tsconfig.json`
  still excludes it, so type-check with the `tsc` command above. `yarn prettier:check` does not
  cover `harness/`; run `npx prettier --check harness`.
- **Timing.** Monaco lays out more than once. With `plugin.css` applied an editor ends at 223px or,
  more often under CPU load, 57px; the specs accept both. See the comment in
  `specs/recording-analytics-editors.cy.ts`.
