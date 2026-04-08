# CLAUDE.md — FlagBridge Docs

> Copiar pra: flagbridge/docs/CLAUDE.md

## O que é

Documentação do FlagBridge. VitePress (Vue), bilíngue EN + PT-BR.

## Stack

VitePress (Vue), i18n built-in, MiniSearch. Deploy: **Vercel**.

## Estrutura

```
getting-started/   → quickstart, installation, concepts
guides/            → targeting, rollouts, testing E2E, webhooks, migrations
api-reference/     → auth, flags, evaluation, testing, webhooks, plugins, marketplace, integrations
sdk/               → node, react, go, python, openfeature
plugins/           → overview, building, publishing, SDK reference
integrations/      → mixpanel, customer-io, amplitude, segment, datadog, slack
compare/           → vs-launchdarkly, vs-growthbook, vs-unleash
```

## Convenções

- Toda página em EN e PT-BR
- Code examples copy-pasteable e testados
- Code groups pra multi-language: ::: code-group
- Custom containers: ::: tip, ::: warning, ::: danger
- Badges CE/Pro: ::: info CE e ::: warning Pro
- Termos técnicos não traduzem (flag, environment, targeting, rollout)
- Getting started: zero to first flag em 5 minutos

## NÃO faça

- Não escreva páginas English-only
- Não use code examples que não funcionam
- Não pule badge CE/Pro em features gated
