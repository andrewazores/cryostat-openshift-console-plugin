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
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import {
  Breadcrumb,
  BreadcrumbHeading,
  Card,
  CardBody,
  PageGroup,
  PageSection,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { configureMonaco } from '../lib/monaco';

configureMonaco();

/**
 * Structural replica of RecordingAnalytics and its Queries tab: the same PatternFly components in the
 * same nesting, with the same CodeEditor props (height="sizeToFit"), inside the .cryostat-app wrapper
 * that CryostatContainer renders. It does not use the real components because those need Cryostat
 * services and a Redux store.
 */
const App: React.FC = () => {
  const [tab, setTab] = React.useState<string | number>('queries');
  return (
    <div className="cryostat-app">
      <PageGroup>
        <PageSection hasBodyWrapper={false} isFilled>
          <Breadcrumb>
            <BreadcrumbHeading>Analytics</BreadcrumbHeading>
          </Breadcrumb>
          <Stack hasGutter>
            <StackItem isFilled>
              <Card isFullHeight>
                <CardBody isFilled>
                  <Tabs id="recording-analytics" activeKey={tab} onSelect={(_event, key) => setTab(key)}>
                    <Tab eventKey="queries" title={<TabTitleText>Queries</TabTitleText>}>
                      <Stack hasGutter>
                        <StackItem>
                          <CodeEditor
                            code={'SELECT *\nFROM events\nLIMIT 10'}
                            height="sizeToFit"
                            language={Language.sql}
                            isLineNumbersVisible
                            isLanguageLabelVisible
                          />
                        </StackItem>
                        <StackItem>
                          <CodeEditor
                            isReadOnly
                            code={'{\n  "a": 1\n}'}
                            height="sizeToFit"
                            language={Language.json}
                            isLineNumbersVisible
                            isLanguageLabelVisible
                          />
                        </StackItem>
                      </Stack>
                    </Tab>
                  </Tabs>
                </CardBody>
              </Card>
            </StackItem>
          </Stack>
        </PageSection>
      </PageGroup>
    </div>
  );
};

createRoot(document.getElementById('route') as HTMLElement).render(<App />);
