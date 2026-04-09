---
title: Testing API
description: Create isolated test sessions with per-flag overrides for E2E and integration testing.
---

# Testing API

The Testing API lets you create isolated sessions with per-flag overrides. Each session has a token that, when included in evaluation requests via `X-FlagBridge-Session`, applies your overrides — without affecting any other user or test run.

This is the foundation of FlagBridge's E2E testing support. See the [E2E testing guide](/guides/testing-e2e) for full Playwright, Cypress, and Vitest examples.

**Auth:** `test` or `full` scope required for all testing endpoints.

---

## POST /v1/testing/sessions {#create-session}

Create a new test session.

```
POST /v1/testing/sessions
Authorization: Bearer fb_sk_test_YOUR_KEY
Content-Type: application/json
```

### Request body {#create-session-body}

```json
{
  "projectId": "proj_abc123",
  "label": "checkout-e2e",
  "ttl": 3600
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `projectId` | string | Yes | Project ID the session belongs to |
| `label` | string | No | Human-readable label for debugging and audit logs |
| `ttl` | number | No | Session lifetime in seconds (default: 3600). **Pro only** — CE ignores this field and always uses 3600. Max: 86400 |

::: info CE
`ttl` is ignored in Community Edition. All sessions use the default 3600s TTL.
:::

::: warning Pro
Pass any `ttl` value from 1 to 86400 to control session lifetime. Useful for long nightly test runs.
:::

### Response `201 Created` {#create-session-response}

```json
{
  "id": "sess_abc123",
  "token": "sess_abc123_xxxxxxxxxxx",
  "projectId": "proj_abc123",
  "label": "checkout-e2e",
  "overrides": {},
  "createdAt": "2026-04-08T00:00:00.000Z",
  "expiresAt": "2026-04-08T01:00:00.000Z"
}
```

The `id` is what you use to manage the session. The `token` (which equals the `id` in CE, or a derived secret token in Pro) is what you pass in the `X-FlagBridge-Session` header on evaluation requests.

::: code-group

```bash [curl]
curl -X POST https://api.flagbridge.io/v1/testing/sessions \
  -H "Authorization: Bearer fb_sk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_abc123",
    "label": "checkout-e2e"
  }'
```

```typescript [Node.js SDK]
const session = await fb.testing.createSession({
  projectId: 'proj_abc123',
  label: 'checkout-e2e',
});

console.log(session.id);    // sess_abc123
console.log(session.token); // pass this in X-FlagBridge-Session
```

:::

---

## GET /v1/testing/sessions/{id} {#get-session}

Get the current state of a session, including all active overrides.

```
GET /v1/testing/sessions/{id}
Authorization: Bearer fb_sk_test_YOUR_KEY
```

::: code-group

```bash [curl]
curl https://api.flagbridge.io/v1/testing/sessions/sess_abc123 \
  -H "Authorization: Bearer fb_sk_test_YOUR_KEY"
```

```typescript [Node.js SDK]
const session = await fb.testing.getSession('sess_abc123');
console.log(session.overrides);
```

:::

### Response `200 OK` {#get-session-response}

```json
{
  "id": "sess_abc123",
  "token": "sess_abc123_xxxxxxxxxxx",
  "projectId": "proj_abc123",
  "label": "checkout-e2e",
  "overrides": {
    "new-checkout": true,
    "checkout-button-color": "green"
  },
  "createdAt": "2026-04-08T00:00:00.000Z",
  "expiresAt": "2026-04-08T01:00:00.000Z"
}
```

---

## DELETE /v1/testing/sessions/{id} {#delete-session}

Destroy a session before its TTL expires. Always call this at the end of your test run to release resources and avoid accumulation.

```
DELETE /v1/testing/sessions/{id}
Authorization: Bearer fb_sk_test_YOUR_KEY
```

::: code-group

```bash [curl]
curl -X DELETE https://api.flagbridge.io/v1/testing/sessions/sess_abc123 \
  -H "Authorization: Bearer fb_sk_test_YOUR_KEY"
```

```typescript [Node.js SDK]
await fb.testing.destroySession('sess_abc123');
```

:::

### Response `204 No Content` {#delete-session-response}

Once destroyed, any evaluation request carrying the session token resolves normally (ignoring overrides).

---

## PUT /v1/testing/sessions/{id}/overrides/{flagKey} {#set-override}

Set or update the override for a single flag in a session. If the flag key already has an override, it is replaced.

```
PUT /v1/testing/sessions/{id}/overrides/{flagKey}
Authorization: Bearer fb_sk_test_YOUR_KEY
Content-Type: application/json
```

### Request body {#set-override-body}

```json
{
  "value": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `value` | boolean \| string | Yes | Override value. Use `true`/`false` for boolean flags; a string for multi-variant flags |

::: code-group

```bash [Boolean flag]
curl -X PUT https://api.flagbridge.io/v1/testing/sessions/sess_abc123/overrides/new-checkout \
  -H "Authorization: Bearer fb_sk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"value": true}'
```

```bash [Multi-variant flag]
curl -X PUT https://api.flagbridge.io/v1/testing/sessions/sess_abc123/overrides/checkout-button-color \
  -H "Authorization: Bearer fb_sk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"value": "green"}'
```

```typescript [Node.js SDK]
await fb.testing.setOverride('sess_abc123', {
  flagKey: 'new-checkout',
  value: true,
});
```

:::

### Response `200 OK` {#set-override-response}

```json
{
  "id": "sess_abc123",
  "overrides": {
    "new-checkout": true
  }
}
```

---

## PUT /v1/testing/sessions/{id}/overrides/batch {#batch-overrides}

Set multiple overrides in a single request.

::: warning Pro
Batch overrides are a Pro feature. Community Edition must call the single-override endpoint for each flag.
:::

```
PUT /v1/testing/sessions/{id}/overrides/batch
Authorization: Bearer fb_sk_test_YOUR_KEY
Content-Type: application/json
```

### Request body {#batch-overrides-body}

```json
{
  "overrides": {
    "new-checkout": true,
    "checkout-button-color": "green",
    "dark-mode": false,
    "free-shipping-banner": true
  }
}
```

Each key is a flag key. Values can be `boolean` or `string`. This call **merges** with existing overrides — it does not replace them. To clear all overrides, destroy and recreate the session.

::: code-group

```bash [curl]
curl -X PUT https://api.flagbridge.io/v1/testing/sessions/sess_abc123/overrides/batch \
  -H "Authorization: Bearer fb_sk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "overrides": {
      "new-checkout": true,
      "checkout-button-color": "green",
      "dark-mode": false
    }
  }'
```

```typescript [Node.js SDK]
await fb.testing.setOverrides('sess_abc123', {
  'new-checkout': true,
  'checkout-button-color': 'green',
  'dark-mode': false,
});
```

:::

### Response `200 OK` {#batch-overrides-response}

```json
{
  "id": "sess_abc123",
  "overrides": {
    "new-checkout": true,
    "checkout-button-color": "green",
    "dark-mode": false
  }
}
```

---

## DELETE /v1/testing/sessions/{id}/overrides/{flagKey} {#delete-override}

Remove the override for a specific flag from a session. After deletion, that flag evaluates normally for requests using this session token.

```
DELETE /v1/testing/sessions/{id}/overrides/{flagKey}
Authorization: Bearer fb_sk_test_YOUR_KEY
```

::: code-group

```bash [curl]
curl -X DELETE https://api.flagbridge.io/v1/testing/sessions/sess_abc123/overrides/new-checkout \
  -H "Authorization: Bearer fb_sk_test_YOUR_KEY"
```

```typescript [Node.js SDK]
await fb.testing.deleteOverride('sess_abc123', 'new-checkout');
```

:::

### Response `204 No Content` {#delete-override-response}

---

## Using a session in evaluation

Pass the session token in the `X-FlagBridge-Session` header on any evaluation request:

```bash
curl -X POST https://api.flagbridge.io/v1/evaluate \
  -H "Authorization: Bearer fb_sk_test_YOUR_KEY" \
  -H "X-FlagBridge-Session: sess_abc123_xxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "new-checkout",
    "context": { "userId": "test-user" }
  }'
```

```json
{
  "flagKey": "new-checkout",
  "enabled": true,
  "variant": null,
  "reason": "TEST_OVERRIDE",
  "ruleId": null,
  "evaluatedAt": "2026-04-08T00:00:00.000Z"
}
```

::: info
Test session overrides take the highest precedence in the [resolution order](/api-reference/evaluation#resolution-order). They override targeting rules, percentage rollouts, and the flag's default state. Users without the session token are completely unaffected.
:::

---

## Related

- [E2E Testing guide](/guides/testing-e2e) — full Playwright, Cypress, and Vitest integration examples
- [Evaluation API](/api-reference/evaluation) — resolution order and `TEST_OVERRIDE` reason
- [Authentication](/api-reference/authentication) — `test` scope key (`fb_sk_test_*`)
