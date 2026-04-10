---
title: FlagBridge vs LaunchDarkly
description: Compare FlagBridge e LaunchDarkly — preços, features, self-hosting e experiência de desenvolvimento lado a lado.
---

# FlagBridge vs LaunchDarkly

LaunchDarkly é a plataforma de feature flags mais estabelecida do mercado. É battle-tested em escala enterprise — mas vem com preço enterprise. FlagBridge é uma alternativa open-source que te dá controle total sobre seus dados, infraestrutura e custos.

## Visão Geral

| | FlagBridge CE | FlagBridge Pro | LaunchDarkly |
|---|---|---|---|
| **Preço** | Grátis para sempre | $49/mês fixo | A partir de ~$8.33/seat/mês (anual) |
| **Limite de seats** | Ilimitado | Ilimitado | Cobrança por seat |
| **Self-hosted** | Sim | Sim | Não (SaaS only) |
| **Open source** | Apache 2.0 | Source-available | Proprietário |
| **Residência de dados** | Sua infraestrutura | Sua infraestrutura | US / EU (limitado) |
| **SDKs** | Node.js, React, Go, Python | Mesmos + suporte prioritário | 25+ SDKs |
| **Updates em real-time** | SSE | SSE + Webhooks | SSE / Streaming |
| **Targeting rules** | Attribute-based, percentages | Mesmos + segments avançados | Engine completa |
| **Audit log** | Built-in | Built-in + export | Built-in |
| **Integrações** | Webhooks, plugin system | Slack, Datadog, Mixpanel + mais | 60+ integrações |

## Comparação de Preços

O pricing do LaunchDarkly começa em $8.33/seat/mês no plano Pro (cobrado anualmente). O tier Enterprise exige contato comercial. Para um time de 10 engenheiros, são aproximadamente **$1.000/ano** no plano mais barato — e cresce linearmente com headcount.

FlagBridge CE é grátis sem limite de seats. FlagBridge Pro custa $49/mês fixo independente do tamanho do time. Self-hosting significa que seu único custo variável é a infraestrutura que você já paga.

::: tip Custo para um time de 10 pessoas
- **LaunchDarkly Pro:** ~$1.000/ano (cresce com headcount)
- **FlagBridge CE:** $0 (self-hosted)
- **FlagBridge Pro:** $588/ano (fixo, seats ilimitados)
:::

## Self-Hosting

FlagBridge foi projetado para self-hosting desde o dia um. Um único `docker compose up` te dá uma instância funcional em menos de 5 minutos — API server, admin dashboard e PostgreSQL.

```bash
git clone https://github.com/flagbridge/flagbridge
cd flagbridge
cp .env.example .env
docker compose up -d
```

LaunchDarkly é SaaS-only. Não existe opção self-hosted. Seus dados de avaliação de flags, contextos de usuário e targeting rules vivem na infraestrutura deles.

::: warning Soberania de dados
Se seus requisitos de compliance exigem que dados de feature flags fiquem na sua infraestrutura (LGPD, GDPR, SOC 2), o modelo SaaS do LaunchDarkly pode não ser suficiente. FlagBridge roda inteiramente nos seus próprios servidores.
:::

## Experiência do Desenvolvedor

### Setup do SDK

Ambas as plataformas oferecem SDKs tipados. Veja como se comparam para uma app React:

**FlagBridge:**

```tsx
import { FlagBridgeProvider, useFlag } from '@flagbridge/sdk-react';

function App() {
  return (
    <FlagBridgeProvider
      apiKey="fb_sk_eval_..."
      apiUrl="https://flags.suaempresa.com"
      environment="production"
      project="meu-app"
    >
      <MeuApp />
    </FlagBridgeProvider>
  );
}

function Feature() {
  const enabled = useFlag('new-checkout', false);
  return enabled ? <NewCheckout /> : <OldCheckout />;
}
```

**LaunchDarkly:**

```tsx
import { withLDProvider, useFlags } from 'launchdarkly-react-client-sdk';

const App = withLDProvider({
  clientSideID: 'your-client-side-id',
})(MyApp);

function Feature() {
  const { newCheckout } = useFlags();
  return newCheckout ? <NewCheckout /> : <OldCheckout />;
}
```

Ambos são diretos. A diferença chave é que FlagBridge permite apontar o SDK para seu próprio endpoint — sem vendor lock-in.

### Updates em Real-Time

Ambas as plataformas suportam updates em real-time via server-sent events (SSE). O SDK React do FlagBridge reconecta automaticamente com exponential backoff e reavalia apenas a flag alterada, minimizando re-renders desnecessários.

### Design da API

FlagBridge expõe uma REST API com documentação OpenAPI. Toda operação disponível no admin dashboard também está disponível via API — flags, environments, targeting rules, webhooks e audit logs.

LaunchDarkly também tem uma REST API abrangente, embora algumas operações exijam tiers específicos.

## Quando Escolher FlagBridge

- **Você precisa de self-hosting** — compliance, soberania de dados, ou simplesmente quer controle total
- **Você é sensível a custo** — tier CE grátis, pricing Pro fixo, sem cobrança por seat
- **Você quer estender a plataforma** — core open-source com sistema de plugins
- **Você tem um time pequeno a médio** — não precisa de 60+ integrações no dia um
- **Você está no Brasil ou LATAM** — FlagBridge tem suporte PT-BR de primeira classe

## Quando Escolher LaunchDarkly

- **Você precisa de 25+ linguagens de SDK** — LaunchDarkly cobre toda plataforma relevante
- **Você precisa de governance enterprise** — approval workflows, SSO/SCIM, multi-org
- **Você tem muitas integrações existentes** — Jira, Slack, Datadog, etc. out of the box
- **Você não quer gerenciar infraestrutura** — SaaS significa zero ops

## Migrando do LaunchDarkly

FlagBridge oferece um caminho de migração do LaunchDarkly:

1. **Exporte suas flags** — use a API do LaunchDarkly para listar todas as configurações
2. **Crie flags no FlagBridge** — via API ou admin dashboard
3. **Troque o SDK** — substitua `launchdarkly-react-client-sdk` por `@flagbridge/sdk-react`
4. **Aponte para sua instância** — atualize a URL da API para seu FlagBridge self-hosted

::: info
Uma ferramenta CLI dedicada para migração está planejada. Veja nosso [roadmap](https://github.com/flagbridge/flagbridge/issues) para acompanhar.
:::

## Resumo

LaunchDarkly é uma plataforma provada com features enterprise profundas. FlagBridge é para times que querem ownership — dos seus dados, custos e infraestrutura de feature flags. Se você está avaliando alternativas, [experimente FlagBridge em 5 minutos](https://docs.flagbridge.io/getting-started/quickstart).
