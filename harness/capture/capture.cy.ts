/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const ANCHOR = '.cryostat-app';
const LOGIN_FORM = '#inputUsername';
const SETTLE_MS = 2000;
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 800 },
  { width: 900, height: 700 },
];
const PROPERTIES = [
  'display',
  'position',
  'box-sizing',
  'width',
  'min-width',
  'height',
  'min-height',
  'max-height',
  'flex-direction',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'overflow-x',
  'overflow-y',
  'padding',
  'margin',
  'font-size',
];
const SESSIONSTORAGE_SVC_NS_KEY = 'cryostat-svc-ns';
const SESSIONSTORAGE_SVC_NAME_KEY = 'cryostat-svc-name';

interface ChainLink {
  tag: string;
  id: string;
  classes: string[];
  box: { width: number; height: number };
  computed: Record<string, string>;
}

interface ConsoleWindow extends Window {
  SERVER_FLAGS?: { authDisabled?: boolean; releaseVersion?: string; consoleVersion?: string };
}

interface CaptureContext {
  consoleImage: string | null;
  sdkVersion: string;
  cryostatNamespace: string | null;
  cryostatName: string | null;
  pagePath: string;
}

/**
 * Describes the anchor element and each of its ancestors up to and including <html>, nearest first.
 */
function describeChain(anchor: HTMLElement): ChainLink[] {
  const view = anchor.ownerDocument.defaultView as Window;
  const chain: ChainLink[] = [];
  for (let node: HTMLElement | null = anchor; node; node = node.parentElement) {
    const style = view.getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    chain.push({
      tag: node.tagName.toLowerCase(),
      id: node.id,
      classes: Array.from(node.classList),
      box: { width: Math.round(rect.width), height: Math.round(rect.height) },
      computed: PROPERTIES.reduce<Record<string, string>>((acc, name) => {
        acc[name] = style.getPropertyValue(name);
        return acc;
      }, {}),
    });
  }
  return chain;
}

/**
 * Fails with an authentication-specific message when the Console is showing its login form, instead
 * of the generic "anchor not found" that would send the user looking in the wrong place.
 */
function failIfLoginPage(): void {
  cy.get('body').then(($body) => {
    if ($body.find(LOGIN_FORM).length > 0) {
      throw new Error(
        'The Console is asking for a login. The capture does not authenticate. Run the Console with ' +
          'authentication disabled (start-console.sh does this) and point CAPTURE_BASE_URL at it.',
      );
    }
  });
}

describe('Console ancestor chain capture', () => {
  it('captures the chain above the plugin root at several viewport sizes', () => {
    cy.task<CaptureContext>('context').then((context) => {
      const captures: unknown[] = [];

      VIEWPORTS.forEach((viewport) => {
        cy.viewport(viewport.width, viewport.height);
        cy.visit(context.pagePath, {
          onBeforeLoad(win) {
            if (context.cryostatNamespace && context.cryostatName) {
              win.sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, context.cryostatNamespace);
              win.sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, context.cryostatName);
            }
          },
        });
        failIfLoginPage();
        cy.get(ANCHOR, { timeout: 60000 }).should('exist');
        cy.wait(SETTLE_MS);
        cy.get(ANCHOR).then(($anchor) => {
          captures.push({ viewport, chain: describeChain($anchor[0]) });
        });
      });

      cy.window().then((win) => {
        const flags = (win as ConsoleWindow).SERVER_FLAGS;
        cy.task('writeCapture', {
          capturedAt: new Date().toISOString().slice(0, 10),
          anchor: ANCHOR,
          page: context.pagePath,
          console: {
            image: context.consoleImage,
            releaseVersion: flags?.releaseVersion ?? flags?.consoleVersion ?? null,
            pluginSdkVersion: context.sdkVersion,
          },
          browser: navigator.userAgent,
          captures,
        });
      });
    });
  });
});
