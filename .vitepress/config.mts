import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'FlagBridge',
  description: 'Feature flags with product intelligence.',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Docs', link: '/getting-started/quickstart' },
          { text: 'API Reference', link: '/api-reference/authentication' },
          { text: 'SDKs', link: '/sdk/node' },
        ],
        sidebar: [
          {
            text: 'Getting Started',
            items: [
              { text: 'Quickstart', link: '/getting-started/quickstart' },
              { text: 'Installation', link: '/getting-started/installation' },
              { text: 'Concepts', link: '/getting-started/concepts' },
            ],
          },
          {
            text: 'Guides',
            items: [
              { text: 'Targeting Rules', link: '/guides/targeting-rules' },
              { text: 'Percentage Rollouts', link: '/guides/percentage-rollouts' },
              { text: 'E2E Testing', link: '/guides/testing-e2e' },
              { text: 'Webhooks', link: '/guides/webhooks' },
              { text: 'Migrations', link: '/guides/migrations' },
            ],
          },
          {
            text: 'API Reference',
            items: [
              { text: 'Authentication', link: '/api-reference/authentication' },
              { text: 'Flags', link: '/api-reference/flags' },
              { text: 'Evaluation', link: '/api-reference/evaluation' },
              { text: 'Testing', link: '/api-reference/testing' },
              { text: 'Webhooks', link: '/api-reference/webhooks' },
              { text: 'Plugins', link: '/api-reference/plugins' },
              { text: 'Marketplace', link: '/api-reference/marketplace' },
              { text: 'Integrations', link: '/api-reference/integrations' },
            ],
          },
          {
            text: 'SDKs',
            items: [
              { text: 'Node.js', link: '/sdk/node' },
              { text: 'React', link: '/sdk/react' },
              { text: 'Go', link: '/sdk/go' },
              { text: 'Python', link: '/sdk/python' },
              { text: 'OpenFeature', link: '/sdk/openfeature' },
            ],
          },
          {
            text: 'Plugins',
            items: [
              { text: 'Overview', link: '/plugins/overview' },
              { text: 'Building Plugins', link: '/plugins/building-plugins' },
              { text: 'Publishing', link: '/plugins/publishing' },
              { text: 'SDK Reference', link: '/plugins/plugin-sdk-reference' },
            ],
          },
          {
            text: 'Integrations',
            items: [
              { text: 'Mixpanel', link: '/integrations/mixpanel' },
              { text: 'Customer.io', link: '/integrations/customer-io' },
              { text: 'Amplitude', link: '/integrations/amplitude' },
              { text: 'Segment', link: '/integrations/segment' },
              { text: 'Datadog', link: '/integrations/datadog' },
              { text: 'Slack', link: '/integrations/slack' },
            ],
          },
        ],
      },
    },
    'pt-br': {
      label: 'Português (BR)',
      lang: 'pt-BR',
      themeConfig: {
        nav: [
          { text: 'Docs', link: '/pt-br/getting-started/quickstart' },
          { text: 'Referência da API', link: '/pt-br/api-reference/authentication' },
          { text: 'SDKs', link: '/pt-br/sdk/node' },
        ],
        sidebar: [
          {
            text: 'Primeiros Passos',
            items: [
              { text: 'Quickstart', link: '/pt-br/getting-started/quickstart' },
              { text: 'Instalação', link: '/pt-br/getting-started/installation' },
              { text: 'Conceitos', link: '/pt-br/getting-started/concepts' },
            ],
          },
          {
            text: 'Guias',
            items: [
              { text: 'Regras de Targeting', link: '/pt-br/guides/targeting-rules' },
              { text: 'Rollouts Graduais', link: '/pt-br/guides/percentage-rollouts' },
              { text: 'Testes E2E', link: '/pt-br/guides/testing-e2e' },
              { text: 'Webhooks', link: '/pt-br/guides/webhooks' },
              { text: 'Migrações', link: '/pt-br/guides/migrations' },
            ],
          },
          {
            text: 'Referência da API',
            items: [
              { text: 'Autenticação', link: '/pt-br/api-reference/authentication' },
              { text: 'Flags', link: '/pt-br/api-reference/flags' },
              { text: 'Avaliação', link: '/pt-br/api-reference/evaluation' },
              { text: 'Testing', link: '/pt-br/api-reference/testing' },
              { text: 'Webhooks', link: '/pt-br/api-reference/webhooks' },
              { text: 'Plugins', link: '/pt-br/api-reference/plugins' },
              { text: 'Marketplace', link: '/pt-br/api-reference/marketplace' },
              { text: 'Integrações', link: '/pt-br/api-reference/integrations' },
            ],
          },
          {
            text: 'SDKs',
            items: [
              { text: 'Node.js', link: '/pt-br/sdk/node' },
              { text: 'React', link: '/pt-br/sdk/react' },
              { text: 'Go', link: '/pt-br/sdk/go' },
              { text: 'Python', link: '/pt-br/sdk/python' },
              { text: 'OpenFeature', link: '/pt-br/sdk/openfeature' },
            ],
          },
          {
            text: 'Plugins',
            items: [
              { text: 'Visão Geral', link: '/pt-br/plugins/overview' },
              { text: 'Construindo Plugins', link: '/pt-br/plugins/building-plugins' },
              { text: 'Publicação', link: '/pt-br/plugins/publishing' },
              { text: 'Referência do SDK', link: '/pt-br/plugins/plugin-sdk-reference' },
            ],
          },
          {
            text: 'Integrações',
            items: [
              { text: 'Mixpanel', link: '/pt-br/integrations/mixpanel' },
              { text: 'Customer.io', link: '/pt-br/integrations/customer-io' },
              { text: 'Amplitude', link: '/pt-br/integrations/amplitude' },
              { text: 'Segment', link: '/pt-br/integrations/segment' },
              { text: 'Datadog', link: '/pt-br/integrations/datadog' },
              { text: 'Slack', link: '/pt-br/integrations/slack' },
            ],
          },
        ],
      },
    },
  },

  themeConfig: {
    logo: '/logo.png',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/flagbridge/flagbridge' },
    ],
    search: {
      provider: 'local',
    },
    editLink: {
      pattern: 'https://github.com/flagbridge/docs/edit/main/:path',
    },
  },
})
