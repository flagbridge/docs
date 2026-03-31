---
title: Quickstart
description: Get FlagBridge running and create your first feature flag in under 5 minutes.
---

# Quickstart

Get FlagBridge running and ship your first feature flag in **under 5 minutes**.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A terminal

## 1. Start FlagBridge

Create a `docker-compose.yml` file:

```yaml
services:
  flagbridge:
    image: ghcr.io/flagbridge/flagbridge:latest
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://flagbridge:flagbridge@db:5432/flagbridge
      SECRET_KEY: change-me-in-production
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

Then run:

```bash
docker compose up -d
```

FlagBridge will be available at `http://localhost:8080`.

## 2. Create a project and API key

```bash
# Create your first project
curl -X POST http://localhost:8080/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "my-app", "slug": "my-app"}'

# The response includes your project ID and a default API key
```

Or open `http://localhost:8080` in your browser and use the setup wizard.

## 3. Create your first flag

```bash
curl -X POST http://localhost:8080/v1/projects/my-app/flags \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new-checkout-flow",
    "name": "New Checkout Flow",
    "description": "Enables the redesigned checkout experience",
    "enabled": false
  }'
```

## 4. Evaluate the flag in your app

::: code-group

```bash [Node.js install]
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

const enabled = await client.isEnabled('new-checkout-flow', {
  userId: 'user-123',
});

if (enabled) {
  // render the new checkout
} else {
  // render the old checkout
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
      <CheckoutPage />
    </FlagBridgeProvider>
  );
}

function CheckoutPage() {
  const newCheckout = useFlag('new-checkout-flow');

  if (newCheckout.enabled) {
    return <NewCheckout />;
  }
  return <OldCheckout />;
}
```

```bash [curl]
curl -X POST http://localhost:8080/v1/evaluate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "new-checkout-flow",
    "context": {
      "userId": "user-123"
    }
  }'
```

:::

Response:

```json
{
  "flagKey": "new-checkout-flow",
  "enabled": false,
  "variant": null,
  "reason": "FLAG_DISABLED"
}
```

## 5. Enable the flag

```bash
curl -X PATCH http://localhost:8080/v1/projects/my-app/flags/new-checkout-flow \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

Evaluate again and you'll get `"enabled": true`. That's it — your first feature flag is live.

## Next steps

- [Targeting rules](/getting-started/concepts) — roll out to specific users or segments
- [Percentage rollouts](/guides/percentage-rollouts) — gradual rollouts with traffic splitting
- [SDK reference](/sdk/node) — full SDK documentation
- [E2E testing](/guides/testing-e2e) — test feature flags in your test suite
