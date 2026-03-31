---
title: Testing API
description: Create isolated test sessions with per-flag overrides for E2E testing.
---

# Testing API

The Testing API lets you create isolated sessions with per-flag overrides. Each session gets a token that, when included in evaluation requests, applies the overrides you've set — without affecting any other user or test.

This is the foundation of FlagBridge's E2E testing support. See the [E2E testing guide](/guides/testing-e2e) for Playwright and Vitest integration examples.

**Auth:** Test key or Admin key required for all testing endpoints.

## POST /api/v1/testing/sessions

Create a new test session.

```
POST /api/v1/testing/sessions
Authorization: Bearer fb_test_YOUR_KEY
Content-Type: application/json
```

### Request body

```json
{
  "name": "checkout-flow-test",
  "ttl": 3600
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | No | Human-readable label (for debugging) |
| `ttl` | number | No | Session lifetime in seconds (default: 3600, max: 86400) |

### Response

```json
{
  "id": "sess_abc123",
  "token": "sess_abc123_xxxxxxxxxxx",
  "name": "checkout-flow-test",
  "overrides": {},
  "createdAt": "2026-03-31T20:00:00.000Z",
  "expiresAt": "2026-03-31T21:00:00.000Z"
}
```

The `token` is what you pass in the `X-FlagBridge-Session` header on evaluation requests.

---

## POST /api/v1/testing/sessions/:id/overrides

Set or update flag overrides for a session.

```
POST /api/v1/testing/sessions/sess_abc123/overrides
Authorization: Bearer fb_test_YOUR_KEY
Content-Type: application/json
```

### Request body

```json
{
  "overrides": {
    "new-checkout-flow": true,
    "checkout-button-color": "green",
    "dark-mode": false
  }
}
```

Each key is a flag key. Values can be:
- `true` / `false` — for boolean flags
- A string — for multi-variant flags (the variant value)

### Response

```json
{
  "id": "sess_abc123",
  "overrides": {
    "new-checkout-flow": true,
    "checkout-button-color": "green",
    "dark-mode": false
  }
}
```

---

## GET /api/v1/testing/sessions/:id

Get the current state of a session.

```bash
curl https://api.flagbridge.io/api/v1/testing/sessions/sess_abc123 \
  -H "Authorization: Bearer fb_test_YOUR_KEY"
```

---

## DELETE /api/v1/testing/sessions/:id

Destroy a session before its TTL expires.

```bash
curl -X DELETE https://api.flagbridge.io/api/v1/testing/sessions/sess_abc123 \
  -H "Authorization: Bearer fb_test_YOUR_KEY"
```

Returns `204 No Content`.

---

## Using a session in evaluation

Pass the session token in the `X-FlagBridge-Session` header on any evaluation request:

```bash
curl -X POST https://api.flagbridge.io/api/v1/evaluate \
  -H "Authorization: Bearer fb_test_YOUR_KEY" \
  -H "X-FlagBridge-Session: sess_abc123_xxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "new-checkout-flow",
    "context": { "userId": "test-user" }
  }'
```

```json
{
  "flagKey": "new-checkout-flow",
  "enabled": true,
  "variant": null,
  "reason": "TEST_OVERRIDE"
}
```

::: info
Test overrides take the highest precedence — they override targeting rules, percentage rollouts, and the default flag state. Other users (without the session token) are completely unaffected.
:::

---

## Full example (Node.js)

```typescript
import { createTestingClient } from '@flagbridge/sdk-node/testing';

const testClient = createTestingClient({
  apiKey: process.env.FLAGBRIDGE_TEST_API_KEY!,
  baseUrl: process.env.FLAGBRIDGE_BASE_URL,
});

// Create a session for this test
const session = await testClient.createSession({ name: 'checkout-test' });

// Set overrides
await session.override('new-checkout-flow', true);
await session.override('checkout-button-color', 'green');

// The session token can be set as a cookie or header in your test browser
console.log(session.token); // pass to Playwright via page.setExtraHTTPHeaders

// Cleanup
await session.destroy();
```

See the [E2E testing guide](/guides/testing-e2e) for complete Playwright and Vitest examples.
