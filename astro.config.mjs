// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'FlagBridge',
      tagline: 'Feature flags with product intelligence.',
      logo: {
        src: './src/assets/logo.svg',
        replacesTitle: false,
      },
      social: {
        github: 'https://github.com/flagbridge/flagbridge',
      },
      defaultLocale: 'root',
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        'pt-br': {
          label: 'Português (BR)',
          lang: 'pt-BR',
        },
      },
      sidebar: [
        {
          label: 'Getting Started',
          translations: { 'pt-BR': 'Primeiros Passos' },
          items: [
            { slug: 'getting-started/quickstart' },
            { slug: 'getting-started/installation' },
            { slug: 'getting-started/concepts' },
          ],
        },
        {
          label: 'Guides',
          translations: { 'pt-BR': 'Guias' },
          items: [
            { slug: 'guides/targeting-rules' },
            { slug: 'guides/percentage-rollouts' },
            { slug: 'guides/testing-e2e' },
            { slug: 'guides/webhooks' },
            { slug: 'guides/migrations' },
          ],
        },
        {
          label: 'API Reference',
          translations: { 'pt-BR': 'Referência da API' },
          items: [
            { slug: 'api-reference/authentication' },
            { slug: 'api-reference/flags' },
            { slug: 'api-reference/evaluation' },
            { slug: 'api-reference/testing' },
            { slug: 'api-reference/webhooks' },
            { slug: 'api-reference/plugins' },
            { slug: 'api-reference/marketplace' },
            { slug: 'api-reference/integrations' },
          ],
        },
        {
          label: 'SDKs',
          items: [
            { slug: 'sdk/node' },
            { slug: 'sdk/react' },
            { slug: 'sdk/go' },
            { slug: 'sdk/python' },
            { slug: 'sdk/openfeature' },
          ],
        },
        {
          label: 'Plugins',
          items: [
            { slug: 'plugins/overview' },
            { slug: 'plugins/building-plugins' },
            { slug: 'plugins/publishing' },
            { slug: 'plugins/plugin-sdk-reference' },
          ],
        },
        {
          label: 'Integrations',
          translations: { 'pt-BR': 'Integrações' },
          items: [
            { slug: 'integrations/mixpanel' },
            { slug: 'integrations/customer-io' },
            { slug: 'integrations/amplitude' },
            { slug: 'integrations/segment' },
            { slug: 'integrations/datadog' },
            { slug: 'integrations/slack' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
