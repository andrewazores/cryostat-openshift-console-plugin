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
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

/**
 * Points Monaco at the workers that harness/build.js emits next to the scenario bundles, and makes
 * @monaco-editor/react use the bundled Monaco instead of fetching one from a CDN.
 *
 * This replaces MonacoWebpackPlugin, so it cannot detect a misconfigured plugin build.
 */
export function configureMonaco(): void {
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker(_moduleId: string, label: string): Worker {
      return new Worker(label === 'json' ? './json.worker.js' : './editor.worker.js', { type: 'module' });
    },
  };
  loader.config({ monaco });
}
