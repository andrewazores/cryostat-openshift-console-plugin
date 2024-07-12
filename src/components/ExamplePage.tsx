import * as React from 'react';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Page, PageSection, Text, TextContent, Title } from '@patternfly/react-core';
import './example.css';
import {ServiceContext} from '../services/Services';

export default function ExamplePage() {
  const { t } = useTranslation('plugin__console-plugin-template');
  const services = React.useContext(ServiceContext);

  const [message, setMessage] = React.useState('');

    React.useEffect(() => {
        services.api.getTest().subscribe(setMessage);
    }, [services.api, setMessage]);

  return (
    <>
      <Helmet>
        <title data-test="example-page-title">{t('Hello, Plugin!')}</title>
      </Helmet>
      <Page>
        <PageSection variant="light">
          <Title headingLevel="h1">{t(message)}</Title>
        </PageSection>
        <PageSection variant="light">
          <TextContent>
            <Text component="p">
              {t(
                'This is a custom page contributed by the console plugin template. The extension that adds the page is declared in console-extensions.json in the project root along with the corresponding nav item. Update console-extensions.json to change or add extensions. Code references in console-extensions.json must have a corresponding property',
              )}
              <code>{t('exposedModules')}</code>{' '}
              {t('in package.json mapping the reference to the module.')}
            </Text>
            <Text component="p">
              {t('After cloning this project, replace references to')}{' '}
              <code>{t('console-template-plugin')}</code>{' '}
              {t('and other plugin metadata in package.json with values for your plugin.')}
            </Text>
          </TextContent>
        </PageSection>
      </Page>
    </>
  );
}
