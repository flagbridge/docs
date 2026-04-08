---
title: Quickstart
description: Do zero à sua primeira feature flag em 5 minutos. Inicie o FlagBridge, crie uma flag e avalie ela na sua aplicação.
---

# Quickstart

Publique sua primeira feature flag em **menos de 5 minutos**. Este guia leva você do zero até uma instância do FlagBridge em funcionamento, com uma flag sendo avaliada em uma aplicação Node.js.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e Docker Compose
- Node.js 18+
- Um terminal

## 1. Iniciar o FlagBridge

Crie um arquivo `docker-compose.yml` em um novo diretório:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: flagbridge
      POSTGRES_USER: flagbridge
      POSTGRES_PASSWORD: flagbridge
    ports:
      - "5432:5432"
  api:
    image: ghcr.io/flagbridge/flagbridge:latest
    environment:
      DATABASE_URL: postgres://flagbridge:flagbridge@postgres:5432/flagbridge?sslmode=disable
      JWT_SECRET: your-secret-key-change-in-production
      PORT: "8080"
    ports:
      - "8080:8080"
    depends_on:
      - postgres
```

Em seguida, suba os serviços:

```bash
docker compose up -d
```

Aguarde alguns segundos para o banco inicializar e verifique se a API está funcionando:

```bash
curl http://localhost:8080/health
# {"status":"ok"}
```

::: warning
Substitua `your-secret-key-change-in-production` por uma string aleatória criptograficamente segura antes de fazer qualquer deploy além da sua máquina local. Mínimo de 32 caracteres.
:::

## 2. Criar seu primeiro projeto

Primeiro, autentique-se para obter um token:

```bash
curl -s -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "changeme"}' \
  | jq -r '.token'
```

::: tip
Salve o token em uma variável de shell — você vai usá-lo ao longo deste guia:
```bash
TOKEN=$(curl -s -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "changeme"}' \
  | jq -r '.token')
```
:::

Agora crie um projeto:

```bash
curl -X POST http://localhost:8080/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meu App",
    "slug": "my-app"
  }'
```

Resposta:

```json
{
  "id": "proj_abc123",
  "name": "Meu App",
  "slug": "my-app",
  "environments": ["production", "staging", "development"],
  "createdAt": "2026-04-08T10:00:00.000Z"
}
```

## 3. Criar uma flag

```bash
curl -X POST http://localhost:8080/v1/projects/my-app/flags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "my-first-flag",
    "name": "My First Flag",
    "description": "Testando o FlagBridge de ponta a ponta",
    "enabled": true
  }'
```

Resposta:

```json
{
  "id": "flag_xyz789",
  "key": "my-first-flag",
  "name": "My First Flag",
  "description": "Testando o FlagBridge de ponta a ponta",
  "environments": {
    "production": { "enabled": true },
    "staging": { "enabled": true },
    "development": { "enabled": true }
  }
}
```

## 4. Criar uma API key

Requisições de avaliação usam uma API key com escopo específico, não o token de admin. Crie uma com o escopo `eval`:

```bash
curl -X POST http://localhost:8080/v1/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chave eval local",
    "projectSlug": "my-app",
    "environment": "development",
    "scope": "eval"
  }'
```

Resposta:

```json
{
  "id": "key_def456",
  "name": "Chave eval local",
  "key": "fb_sk_eval_...",
  "scope": "eval",
  "environment": "development"
}
```

::: warning
Copie o valor de `key` agora — ele não será exibido novamente.
:::

## 5. Avaliar pelo SDK

Instale o SDK Node.js:

```bash
npm install @flagbridge/sdk-node
```

Crie um arquivo `check-flag.mjs`:

```typescript
import { FlagBridge } from '@flagbridge/sdk-node';

const fb = new FlagBridge({
  apiKey: 'fb_sk_eval_...',   // substitua pela sua chave do passo 4
  baseUrl: 'http://localhost:8080',
});

const enabled = await fb.isEnabled('my-first-flag');
console.log('Flag enabled:', enabled);
```

Execute:

```bash
node check-flag.mjs
# Flag enabled: true
```

Pronto. Você tem uma instância do FlagBridge em funcionamento, uma feature flag criada e uma aplicação avaliando ela.

## 6. Desativar a flag

```bash
curl -X PATCH http://localhost:8080/v1/projects/my-app/flags/my-first-flag \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"environments": {"development": {"enabled": false}}}'
```

Execute `node check-flag.mjs` novamente e você verá `Flag enabled: false` — sem mudança de código, sem redeploy.

## Próximos passos

- [Conceitos Fundamentais](/pt-br/getting-started/concepts) — entenda environments, regras de targeting, escopos de API key e a ordem de avaliação
- [Instalação](/pt-br/getting-started/installation) — referência de variáveis de ambiente, binário Go e deployment no Kubernetes
- [Regras de targeting](/pt-br/guides/targeting) — faça rollout para usuários ou segmentos específicos
- [Testing API](/pt-br/api-reference/testing) — isole o estado das flags em testes E2E com testing sessions
- [Guia self-hosted](/pt-br/guides/self-hosted) — checklist de deployment para produção
