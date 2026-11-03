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
import path from 'path';
import { defineConfig } from 'vitest/config';

const resolveRoot = (...segments: string[]) => path.resolve(import.meta.dirname, ...segments);

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@app\//, replacement: `${resolveRoot('src/cryostat-web/src/app')}/` },
      { find: /^@i18n\//, replacement: `${resolveRoot('src/cryostat-web/src/i18n')}/` },
      { find: /^@console-plugin\//, replacement: `${resolveRoot('src/openshift')}/` },
      { find: /^src\/schema\//, replacement: `${resolveRoot('src/cryostat-web/src/schema')}/` },
    ],
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/openshift/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest/setup.ts'],
    clearMocks: true,
    css: false,
    server: {
      deps: {
        inline: [/@openshift-console/, /@openshift\/dynamic-plugin-sdk-utils/, /@patternfly/, /nanoid/, /uuid/],
      },
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
  },
});
