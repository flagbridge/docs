---
title: Evaluation
description: POST /evaluate and /evaluate/batch — evaluate feature flags for a user context, with resolution order and full field reference.
---

# Evaluation

The evaluation endpoints are the core of FlagBridge. They determine whether a flag is enabled for a given user context, applying targeting rules, rollout percentages, and test overrides in a defined resolution order.

**Auth:** `eval`, `test`, or `full` scope.

---

## POST /v1/evaluate

Evaluate a single flag for a user context.

```
POST /v1/evaluate
Authorization: Bearer fb_sk_eval_YOUR_KEY
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
| `context` | object | No | Evaluation context attributes (any key-value pairs) |
| `context.userId` | string | No | Unique user identifier — required for consistent percentage rollout bucketing |

### Response `200 OK`

```json
{
  "flagKey": "new-checkout-flow",
  "enabled": true,
  "variant": null,
  "reason": "TARGETING_RULE_MATCH",
  "ruleId": "rule_abc123",
  "evaluatedAt": "2026-04-08T00:00:00.000Z"
}
```

| Field | Type | Description |
|---|---|---|
| `flagKey` | string | The evaluated flag key |
| `enabled` | boolean | Whether the flag is enabled for this context |
| `variant` | string \| null | Variant value for multi-variant flags; `null` for boolean flags |
| `reason` | string | Why the flag resolved to this value (see below) |
| `ruleId` | string \| null | ID of the matching targeting rule, if applicable |
| `evaluatedAt` | string | ISO 8601 timestamp of the evaluation |

### Examples

::: code-group

```bash [curl]
curl -X POST https://api.flagbridge.io/v1/evaluate \
  -H "Authorization: Bearer fb_sk_eval_YOUR_KEY" \
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

console.log(result.enabled); // true
console.log(result.reason);  // 'TARGETING_RULE_MATCH'
```

:::

---

## POST /v1/evaluate/batch

Evaluate multiple flags in a single request. Uses one network round-trip instead of one per flag.

```
POST /v1/evaluate/batch
Authorization: Bearer fb_sk_eval_YOUR_KEY
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
| `flags` | string[] | Yes | Array of flag keys to evaluate (max 50 per request) |
| `context` | object | No | Evaluation context applied to all flags in the batch |

### Response `200 OK`

```json
{
  "results": {
    "new-checkout-flow": {
      "flagKey": "new-checkout-flow",
      "enabled": true,
      "variant": null,
      "reason": "TARGETING_RULE_MATCH",
      "ruleId": "rule_abc123",
      "evaluatedAt": "2026-04-08T00:00:00.000Z"
    },
    "dark-mode": {
      "flagKey": "dark-mode",
      "enabled": false,
      "variant": null,
      "reason": "FLAG_DISABLED",
      "ruleId": null,
      "evaluatedAt": "2026-04-08T00:00:00.000Z"
    },
    "sidebar-v2": {
      "flagKey": "sidebar-v2",
      "enabled": true,
      "variant": "compact",
      "reason": "PERCENTAGE_ROLLOUT",
      "ruleId": null,
      "evaluatedAt": "2026-04-08T00:00:00.000Z"
    }
  },
  "evaluatedAt": "2026-04-08T00:00:00.000Z"
}
```

### Examples

::: code-group

```bash [curl]
curl -X POST https://api.flagbridge.io/v1/evaluate/batch \
  -H "Authorization: Bearer fb_sk_eval_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flags": ["new-checkout-flow", "dark-mode", "sidebar-v2"],
    "context": { "userId": "user-123", "plan": "pro" }
  }'
```

```typescript [Node.js SDK]
const results = await client.evaluateBatch(
  ['new-checkout-flow', 'dark-mode', 'sidebar-v2'],
  { userId: 'user-123', plan: 'pro' }
);

results['new-checkout-flow'].enabled; // true
results['dark-mode'].enabled;         // false
results['sidebar-v2'].variant;        // 'compact'
```

:::

::: info
Prefer batch evaluation over multiple individual `evaluate` calls when you need several flags at once — especially in server-rendered pages where every extra request adds latency.
:::

---

## Resolution order

When an evaluation request comes in, FlagBridge resolves the result in this order:

1. **Test session override** — if the request includes an `X-FlagBridge-Session` header with a valid session token, and that session has an override for this flag, the override wins immediately. No other rules are checked.

2. **Flag disabled** — if the flag is globally disabled for the environment, return `enabled: false` with reason `FLAG_DISABLED`.

3. **Targeting rules** — evaluate rules top-to-bottom. The first matching rule determines the result. Return `TARGETING_RULE_MATCH`.

4. **Percentage rollout** — if a rollout percentage is set and no rule matched, bucket the user by `userId` hash. Return `PERCENTAGE_ROLLOUT` (included) or `PERCENTAGE_ROLLOUT_EXCLUDED` (excluded).

5. **Flag enabled globally** — if the flag is enabled with no targeting rules and no rollout, all users get `enabled: true`. Return `FLAG_ENABLED`.

6. **Flag not found** — if the flag key does not exist, return `enabled: false` with reason `FLAG_NOT_FOUND`. This never throws an error.

### Evaluation reasons

| Reason | Description |
|---|---|
| `TEST_OVERRIDE` | Overridden by an active test session |
| `FLAG_DISABLED` | Flag is disabled for this environment |
| `TARGETING_RULE_MATCH` | A targeting rule condition matched the context |
| `PERCENTAGE_ROLLOUT` | User is included in the percentage rollout |
| `PERCENTAGE_ROLLOUT_EXCLUDED` | User is excluded from the percentage rollout |
| `FLAG_ENABLED` | Flag is globally enabled with no additional rules |
| `FLAG_NOT_FOUND` | Flag key does not exist in this project |

---

## Test session header

When running E2E tests, pass the session token in the `X-FlagBridge-Session` header. This activates test overrides for that request without affecting any other traffic.

::: code-group

```bash [curl]
curl -X POST https://api.flagbridge.io/v1/evaluate \
  -H "Authorization: Bearer fb_sk_test_YOUR_KEY" \
  -H "X-FlagBridge-Session: sess_abc123" \
  -H "Content-Type: application/json" \
  -d '{"flagKey": "new-checkout-flow", "context": {"userId": "test-user"}}'
```

```typescript [Node.js SDK]
// The SDK reads X-FlagBridge-Session from the incoming request automatically
// when you configure it with passthrough headers enabled
const result = await client.evaluate('new-checkout-flow', {
  userId: 'test-user',
  _sessionId: req.headers['x-flagbridge-session'],
});
```

:::

The response will include `"reason": "TEST_OVERRIDE"` when a session override is active.

See the [Testing API](/api-reference/testing) for how to create sessions and set overrides.
