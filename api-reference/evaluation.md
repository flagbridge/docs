---
title: Evaluation
description: POST /evaluate and /evaluate/batch — evaluate feature flags for a user context.
---

# Evaluation

The evaluation endpoints are the core of FlagBridge. They determine whether a flag is enabled for a given user context.

## POST /v1/evaluate

Evaluate a single flag.

**Auth:** Live key, Test key, or Admin key

```
POST /v1/evaluate
Authorization: Bearer fb_live_YOUR_KEY
Content-Type: application/json
```

### Request body

```json
{
  "flagKey": "new-checkout-flow",
  "context": {
    "userId": "user-123",
    "email": "user@example.com",
    "country": "BR",
    "plan": "pro"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `flagKey` | string | Yes | The flag's unique key |
| `context` | object | No | Evaluation context attributes |
| `context.userId` | string | No | Unique user identifier (used for percentage rollouts) |

### Response

```json
{
  "flagKey": "new-checkout-flow",
  "enabled": true,
  "variant": null,
  "reason": "TARGETING_RULE_MATCH",
  "ruleId": "rule_abc123",
  "evaluatedAt": "2026-03-31T20:00:00.000Z"
}
```

| Field | Type | Description |
|---|---|---|
| `flagKey` | string | The evaluated flag key |
| `enabled` | boolean | Whether the flag is enabled |
| `variant` | string \| null | Variant value (for multi-variant flags) |
| `reason` | string | Evaluation reason (see below) |
| `ruleId` | string \| null | ID of the matching rule, if any |
| `evaluatedAt` | string | ISO 8601 timestamp |

### Evaluation reasons

| Reason | Description |
|---|---|
| `FLAG_DISABLED` | Flag is globally disabled for this environment |
| `FLAG_ENABLED` | Flag is globally enabled (no targeting rules) |
| `TARGETING_RULE_MATCH` | A targeting rule matched |
| `PERCENTAGE_ROLLOUT` | Included in percentage rollout |
| `PERCENTAGE_ROLLOUT_EXCLUDED` | Excluded from percentage rollout |
| `TEST_OVERRIDE` | Overridden by a test session |
| `FLAG_NOT_FOUND` | Flag does not exist (returns `enabled: false`) |

### Examples

::: code-group

```bash [curl]
curl -X POST https://api.flagbridge.io/v1/evaluate \
  -H "Authorization: Bearer fb_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "new-checkout-flow",
    "context": {
      "userId": "user-123",
      "plan": "pro"
    }
  }'
```

```typescript [Node.js SDK]
const result = await client.evaluate('new-checkout-flow', {
  userId: 'user-123',
  plan: 'pro',
});
```

:::

---

## POST /v1/evaluate/batch

Evaluate multiple flags in a single request. More efficient than multiple individual requests.

**Auth:** Live key, Test key, or Admin key

```
POST /v1/evaluate/batch
Authorization: Bearer fb_live_YOUR_KEY
Content-Type: application/json
```

### Request body

```json
{
  "flags": ["new-checkout-flow", "dark-mode", "sidebar-v2"],
  "context": {
    "userId": "user-123",
    "plan": "pro"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `flags` | string[] | Yes | Array of flag keys to evaluate (max 50) |
| `context` | object | No | Evaluation context (applied to all flags) |

### Response

```json
{
  "results": {
    "new-checkout-flow": {
      "flagKey": "new-checkout-flow",
      "enabled": true,
      "variant": null,
      "reason": "TARGETING_RULE_MATCH"
    },
    "dark-mode": {
      "flagKey": "dark-mode",
      "enabled": false,
      "variant": null,
      "reason": "FLAG_DISABLED"
    },
    "sidebar-v2": {
      "flagKey": "sidebar-v2",
      "enabled": true,
      "variant": "compact",
      "reason": "PERCENTAGE_ROLLOUT"
    }
  },
  "evaluatedAt": "2026-03-31T20:00:00.000Z"
}
```

### Examples

::: code-group

```bash [curl]
curl -X POST https://api.flagbridge.io/v1/evaluate/batch \
  -H "Authorization: Bearer fb_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flags": ["new-checkout-flow", "dark-mode"],
    "context": { "userId": "user-123" }
  }'
```

```typescript [Node.js SDK]
const results = await client.evaluateBatch(
  ['new-checkout-flow', 'dark-mode'],
  { userId: 'user-123' }
);

results['new-checkout-flow'].enabled; // true
results['dark-mode'].enabled;         // false
```

:::

::: info
Batch evaluation uses a single network round-trip. Prefer it over multiple `evaluate` calls when you need several flags at once — especially in server-rendered pages.
:::

## Test session header

When running E2E tests, pass the session token as a header to apply test overrides:

```bash
curl -X POST https://api.flagbridge.io/v1/evaluate \
  -H "Authorization: Bearer fb_test_YOUR_KEY" \
  -H "X-FlagBridge-Session: sess_abc123" \
  -H "Content-Type: application/json" \
  -d '{"flagKey": "new-checkout-flow", "context": {"userId": "user-123"}}'
```

See the [Testing API](/api-reference/testing) for how to create sessions and set overrides.
