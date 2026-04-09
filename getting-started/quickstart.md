---
title: Quickstart
description: Zero to your first feature flag in 5 minutes. Start FlagBridge, create a flag, and evaluate it from your app.
---

# Quickstart

Ship your first feature flag in **under 5 minutes**. This guide takes you from nothing to a running FlagBridge instance with a flag evaluated from a Node.js app.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Node.js 18+
- A terminal

## 1. Start FlagBridge

Create a `docker-compose.yml` file in a new directory:

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

Then bring it up:

```bash
docker compose up -d
```

Wait a few seconds for the database to initialize, then verify the API is healthy:

```bash
curl http://localhost:8080/v1/health
# {"status":"ok"}
```

::: warning
Replace `your-secret-key-change-in-production` with a cryptographically random string before deploying anywhere beyond your local machine. At least 32 characters.
:::

## 2. Create your first project

First, authenticate to get a token:

```bash
curl -s -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@flagbridge.io", "password": "flagbridge-admin-2026"}' \
  | jq -r '.token'
```

::: tip
Save the token to a shell variable — you'll use it throughout this guide:
```bash
TOKEN=$(curl -s -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@flagbridge.io", "password": "flagbridge-admin-2026"}' \
  | jq -r '.token')
```
:::

Now create a project:

```bash
curl -X POST http://localhost:8080/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "slug": "my-app"
  }'
```

Response:

```json
{
  "id": "proj_abc123",
  "name": "My App",
  "slug": "my-app",
  "environments": ["production", "staging", "development"],
  "createdAt": "2026-04-08T10:00:00.000Z"
}
```

## 3. Create a flag

```bash
curl -X POST http://localhost:8080/v1/projects/my-app/flags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "my-first-flag",
    "name": "My First Flag",
    "description": "Testing FlagBridge end-to-end",
    "enabled": true
  }'
```

Response:

```json
{
  "id": "flag_xyz789",
  "key": "my-first-flag",
  "name": "My First Flag",
  "description": "Testing FlagBridge end-to-end",
  "environments": {
    "production": { "enabled": true },
    "staging": { "enabled": true },
    "development": { "enabled": true }
  }
}
```

## 4. Create an API key

Evaluation requests use a scoped API key, not your admin token. Create one with the `eval` scope:

```bash
curl -X POST http://localhost:8080/v1/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Local eval key",
    "projectSlug": "my-app",
    "environment": "development",
    "scope": "eval"
  }'
```

Response:

```json
{
  "id": "key_def456",
  "name": "Local eval key",
  "key": "fb_sk_eval_...",
  "scope": "eval",
  "environment": "development"
}
```

::: warning
Copy the `key` value now — it won't be shown again.
:::

## 5. Evaluate from the SDK

Install the Node.js SDK:

```bash
npm install @flagbridge/sdk-node
```

Create a file `check-flag.mjs`:

```typescript
import { FlagBridge } from '@flagbridge/sdk-node';

const fb = new FlagBridge({
  apiKey: 'fb_sk_eval_...',   // replace with your key from step 4
  baseUrl: 'http://localhost:8080',
});

const enabled = await fb.isEnabled('my-first-flag');
console.log('Flag enabled:', enabled);
```

Run it:

```bash
node check-flag.mjs
# Flag enabled: true
```

That's it. You have a running FlagBridge instance, a feature flag, and an app evaluating it.

## 6. Toggle the flag off

```bash
curl -X PATCH http://localhost:8080/v1/projects/my-app/flags/my-first-flag \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"environments": {"development": {"enabled": false}}}'
```

Run `node check-flag.mjs` again and you'll get `Flag enabled: false` — no code change, no redeploy.

## Next steps

- [Core Concepts](/getting-started/concepts) — understand environments, targeting rules, API key scopes, and evaluation order
- [Installation](/getting-started/installation) — environment variables reference, Go binary, and Kubernetes deployment
- [Targeting rules](/guides/targeting-rules) — roll out to specific users or segments
- [Testing API](/api-reference/testing) — isolate flag state in E2E tests with testing sessions
- [Self-hosted guide](/guides/self-hosted) — production-ready deployment checklist
