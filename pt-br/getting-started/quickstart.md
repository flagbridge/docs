---
title: Quickstart
description: Coloque o FlagBridge em funcionamento e crie sua primeira feature flag em menos de 5 minutos.
---

# Quickstart

Coloque o FlagBridge em funcionamento e publique sua primeira feature flag em **menos de 5 minutos**.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e Docker Compose
- Um terminal

## 1. Iniciar o FlagBridge

Crie um arquivo `docker-compose.yml`:

```yaml
services:
  flagbridge:
    image: ghcr.io/flagbridge/flagbridge:latest
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://flagbridge:flagbridge@db:5432/flagbridge
      SECRET_KEY: mude-em-producao
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: flagbridge
      POSTGRES_PASSWORD: flagbridge
      POSTGRES_DB: flagbridge
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U flagbridge"]
      interval: 5s
      timeout: 5s
      retries: 5
```

Em seguida, execute:

```bash
docker compose up -d
```

O FlagBridge estará disponível em `http://localhost:8080`.

## 2. Criar projeto e API key

```bash
# Criar seu primeiro projeto
curl -X POST http://localhost:8080/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "meu-app", "slug": "meu-app"}'

# A resposta inclui o ID do projeto e uma API key padrão
```

Ou abra `http://localhost:8080` no navegador e use o assistente de configuração.

## 3. Criar sua primeira flag

```bash
curl -X POST http://localhost:8080/v1/projects/meu-app/flags \
  -H "Authorization: Bearer SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "novo-checkout",
    "name": "Novo Checkout",
    "description": "Ativa a experiência de checkout redesenhada",
    "enabled": false
  }'
```

## 4. Avaliar a flag na sua aplicação

::: code-group
```bash [Node.js]
npm install @flagbridge/sdk-node
```
:::

::: code-group
```typescript [Node.js]
import { FlagBridgeClient } from '@flagbridge/sdk-node';

const client = new FlagBridgeClient({
  apiKey: process.env.FLAGBRIDGE_API_KEY,
  baseUrl: 'http://localhost:8080',
});

const habilitado = await client.isEnabled('novo-checkout', {
  userId: 'user-123',
});

if (habilitado) {
  // renderizar o novo checkout
} else {
  // renderizar o checkout antigo
}
```

```tsx [React]
import { FlagBridgeProvider, useFlag } from '@flagbridge/sdk-react';

function App() {
  return (
    <FlagBridgeProvider
      apiKey={process.env.NEXT_PUBLIC_FLAGBRIDGE_API_KEY}
      baseUrl="http://localhost:8080"
      user={{ id: 'user-123' }}
    >
      <PaginaCheckout />
    </FlagBridgeProvider>
  );
}

function PaginaCheckout() {
  const novoCheckout = useFlag('novo-checkout');

  if (novoCheckout.enabled) {
    return <NovoCheckout />;
  }
  return <CheckoutAntigo />;
}
```

```bash [curl]
curl -X POST http://localhost:8080/v1/evaluate \
  -H "Authorization: Bearer SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "novo-checkout",
    "context": {
      "userId": "user-123"
    }
  }'
```
:::

Resposta:

```json
{
  "flagKey": "novo-checkout",
  "enabled": false,
  "variant": null,
  "reason": "FLAG_DISABLED"
}
```

## 5. Habilitar a flag

```bash
curl -X PATCH http://localhost:8080/v1/projects/meu-app/flags/novo-checkout \
  -H "Authorization: Bearer SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

Avalie novamente e você receberá `"enabled": true`. Pronto — sua primeira feature flag está no ar!

## Próximos passos

- [Conceitos](/pt-br/getting-started/concepts) — regras de targeting e segmentos
- [Rollouts graduais](/pt-br/guides/percentage-rollouts) — divisão de tráfego
- [Referência do SDK](/pt-br/sdk/node) — documentação completa do SDK
- [Testes E2E](/pt-br/guides/testing-e2e) — testando feature flags na sua suíte de testes
