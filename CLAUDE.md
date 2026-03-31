# CLAUDE.md — FlagBridge Documentation Site

## What This Is

The FlagBridge documentation site built with VitePress. Bilingual EN/PT-BR.

- **Live:** docs.flagbridge.io
- **Repo:** https://github.com/flagbridge/docs
- **Deploy:** Vercel

## Stack

| Layer     | Tech                     |
|-----------|--------------------------|
| Framework | VitePress 1.6            |
| i18n      | VitePress locales (EN root, PT-BR) |
| Search    | VitePress local search   |
| Deploy    | Vercel                   |

## Content Structure

```
docs/
├── index.md                    # EN homepage
├── getting-started/            # Quickstart, installation, concepts
├── guides/                     # Targeting, rollouts, testing, webhooks, migrations
├── api-reference/              # Auth, flags, evaluation, testing, webhooks, plugins, marketplace, integrations
├── sdk/                        # Node, React, Go, Python, OpenFeature
├── plugins/                    # Overview, building, publishing, SDK reference
├── integrations/               # Mixpanel, Customer.io, Amplitude, Segment, Datadog, Slack
└── pt-br/                      # Same structure, Portuguese translations
```

## Conventions

- Markdown (.md) format for all content
- Every page must exist in both EN and PT-BR
- Code examples must be copy-pasteable
- Use VitePress containers: `::: info`, `::: warning`, `::: danger`, `::: tip`
- Use VitePress code groups for multi-language examples: `::: code-group`
- Badge CE/Pro features with bold text: **Pro**, **CE**
- API reference pages should include request/response examples with curl + SDK

## Development

```bash
pnpm dev      # Start dev server
pnpm build    # Production build
pnpm preview  # Preview production build
```

## Do NOT

- Write English-only pages — always provide PT-BR translation
- Use code examples that won't actually work
- Skip the Pro/CE label on feature-gated content
