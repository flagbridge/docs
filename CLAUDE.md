# CLAUDE.md — FlagBridge Documentation Site

## What This Is

The FlagBridge documentation site built with Starlight (Astro). Bilingual EN/PT-BR.

- **Live:** docs.flagbridge.io
- **Repo:** https://github.com/flagbridge/docs
- **Deploy:** Cloudflare Pages

## Stack

| Layer     | Tech                     |
|-----------|--------------------------|
| Framework | Starlight (Astro)        |
| i18n      | Starlight native (EN default, PT-BR) |
| Deploy    | Cloudflare Pages         |
| Search    | Pagefind (built-in)      |

## Content Structure

```
docs/
├── getting-started/
│   ├── quickstart.mdx         # Docker compose + first flag in 5 min
│   ├── installation.mdx       # Self-hosted, SaaS, Kubernetes (Helm)
│   └── concepts.mdx           # Flags, environments, projects, targeting
├── guides/
│   ├── targeting-rules.mdx
│   ├── percentage-rollouts.mdx
│   ├── testing-e2e.mdx        # Testing API with Playwright/Cypress examples
│   ├── webhooks.mdx
│   └── migrations.mdx         # From LaunchDarkly, Unleash, Flagsmith
├── api-reference/
│   ├── authentication.mdx     # API key scopes
│   ├── flags.mdx              # CRUD endpoints
│   ├── evaluation.mdx         # POST /evaluate, /evaluate/batch
│   ├── testing.mdx            # Sessions, overrides
│   ├── webhooks.mdx           # Registration, events, delivery
│   ├── plugins.mdx            # Install, config, status
│   ├── marketplace.mdx        # Listings, purchase (Pro)
│   └── integrations.mdx       # Managed connectors (Pro)
├── sdk/
│   ├── node.mdx               # @flagbridge/sdk-node
│   ├── react.mdx              # @flagbridge/sdk-react
│   ├── go.mdx                 # @flagbridge/sdk-go
│   ├── python.mdx             # @flagbridge/sdk-python
│   └── openfeature.mdx        # @flagbridge/openfeature-provider
├── plugins/
│   ├── overview.mdx           # Plugin architecture
│   ├── building-plugins.mdx   # Plugin SDK guide
│   ├── publishing.mdx         # Marketplace submission
│   └── plugin-sdk-reference.mdx
└── integrations/
    ├── mixpanel.mdx
    ├── customer-io.mdx
    ├── amplitude.mdx
    ├── segment.mdx
    ├── datadog.mdx
    └── slack.mdx
```

## Conventions

- MDX format for all content (Astro components allowed)
- Every page must exist in both EN and PT-BR
- Code examples must be copy-pasteable and tested
- Use Starlight components: `<Tabs>`, `<TabItem>`, `<Aside>`, `<Card>`
- API reference pages should include request/response examples with curl + SDK
- Badge CE/Pro features clearly: use `<Badge text="Pro" variant="note" />` or `<Badge text="CE" variant="success" />`

## Priorities

1. Getting started guide (quickstart to first flag in 5 min)
2. SDK docs (Node, React — most used)
3. API reference (all 54 endpoints with examples)
4. Testing E2E guide (key differentiator)

## Do NOT

- Write English-only pages — always provide PT-BR translation
- Use code examples that won't actually work
- Skip the Pro/CE badge on feature-gated content
