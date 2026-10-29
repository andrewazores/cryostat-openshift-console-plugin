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

const SCENARIO = '/recording-analytics-editors.html';
const EDITORS = '.monaco-editor';
const MIN_NOT_COLLAPSED_HEIGHT = 40;
const COLLAPSED_HEIGHT = 10;
const HOLD_MS = 1500;

/**
 * Asserts the rendered height of both editors. Cypress retries the assertion until it holds, so it
 * waits out Monaco's layout passes. The first pass lays the editor out at its content height and a
 * later one resizes it to its container, so a reading taken too early is a transient state. That is
 * why this asserts on the expected end state instead of waiting for the height to stop changing:
 * a transient reading cannot satisfy an assertion about the end state by accident.
 */
function expectEditorHeights(check: (height: number) => void): void {
  cy.get(EDITORS).should(($editors) => {
    expect($editors).to.have.length(2);
    $editors.each((_index, editor) => check(Math.round(editor.getBoundingClientRect().height)));
  });
}

describe('Recording Analytics editors in the Console shell', () => {
  // With plugin.css the editors settle at one of two heights: 223px (filling the 15rem container) or
  // 57px (the content height of this scenario's three lines). Under CPU load the 57px outcome is
  // common; on an idle machine it is rare. Both show the whole editor, so the threshold only
  // separates "collapsed" from "shows its content". Which layout pass produces each outcome has not
  // been established.
  it('renders both editors showing their content with plugin.css applied', () => {
    cy.visit(SCENARIO);
    const notCollapsed = (height: number) => expect(height).to.be.at.least(MIN_NOT_COLLAPSED_HEIGHT);
    expectEditorHeights(notCollapsed);
    cy.wait(HOLD_MS);
    expectEditorHeights(notCollapsed);
    cy.screenshot('with-plugin-css');
  });

  it('collapses the editors without plugin.css, which is the bug plugin.css fixes', () => {
    cy.visit(`${SCENARIO}?plugin-css=off`);
    const collapsed = (height: number) => expect(height).to.be.at.most(COLLAPSED_HEIGHT);
    expectEditorHeights(collapsed);
    cy.wait(HOLD_MS);
    expectEditorHeights(collapsed);
    cy.screenshot('without-plugin-css');
  });
});
