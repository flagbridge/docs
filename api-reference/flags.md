---
title: Flags
description: CRUD endpoints for managing feature flags — create, list, get, update, delete, and control per-environment state.
---

# Flags

Flag management endpoints for creating, reading, updating, and deleting feature flags within a project, plus per-environment state control.

**Auth:** `mgmt` or `full` scope required for all flag management endpoints.

## Flag object

```json
{
  "id": "flag_abc123",
  "key": "new-checkout-flow",
  "name": "New Checkout Flow",
  "description": "Enables the redesigned checkout experience",
  "variants": [],
  "rules": [],
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-04-08T00:00:00.000Z"
}
```

Flag state (enabled/disabled, rollout percentage) is per-environment. See [Set state](#put-v1projectsslugflagskeystatusenv) below.

---

## POST /v1/projects/{slug}/flags

Create a new flag.

**Scope:** `mgmt`

::: code-group

```bash [curl]
curl -X POST https://api.flagbridge.io/v1/projects/my-app/flags \
  -H "Authorization: Bearer fb_sk_mgmt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new-checkout-flow",
    "name": "New Checkout Flow",
    "description": "Enables the redesigned checkout experience"
  }'
```

```typescript [Node.js SDK]
const flag = await adminClient.flags.create('my-app', {
  key: 'new-checkout-flow',
  name: 'New Checkout Flow',
  description: 'Enables the redesigned checkout experience',
});
```

:::

### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | string | Yes | Unique flag key (kebab-case, immutable after creation) |
| `name` | string | Yes | Human-readable display name |
| `description` | string | No | Optional description |
| `variants` | array | No | Variant definitions for multi-variant flags |

### Response `201 Created`

```json
{
  "id": "flag_abc123",
  "key": "new-checkout-flow",
  "name": "New Checkout Flow",
  "description": "Enables the redesigned checkout experience",
  "variants": [],
  "rules": [],
  "createdAt": "2026-04-08T00:00:00.000Z",
  "updatedAt": "2026-04-08T00:00:00.000Z"
}
```

---

## GET /v1/projects/{slug}/flags

List all flags in a project.

**Scope:** `mgmt`

::: code-group

```bash [curl]
curl https://api.flagbridge.io/v1/projects/my-app/flags \
  -H "Authorization: Bearer fb_sk_mgmt_YOUR_KEY"
```

```typescript [Node.js SDK]
const { flags, total } = await adminClient.flags.list('my-app');
```

:::

### Query parameters

| Parameter | Type | Description |
|---|---|---|
| `environment` | string | Filter by environment slug |
| `q` | string | Search by key or name |
| `page` | number | Page number (default: 1) |
| `perPage` | number | Results per page (default: 20, max: 100) |

### Response `200 OK`

```json
{
  "flags": [
    {
      "id": "flag_abc123",
      "key": "new-checkout-flow",
      "name": "New Checkout Flow",
      "createdAt": "2026-04-08T00:00:00.000Z",
      "updatedAt": "2026-04-08T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "perPage": 20
}
```

---

## GET /v1/projects/{slug}/flags/{key}

Get a single flag by key.

**Scope:** `mgmt`

::: code-group

```bash [curl]
curl https://api.flagbridge.io/v1/projects/my-app/flags/new-checkout-flow \
  -H "Authorization: Bearer fb_sk_mgmt_YOUR_KEY"
```

```typescript [Node.js SDK]
const flag = await adminClient.flags.get('my-app', 'new-checkout-flow');
```

:::

### Response `200 OK`

Returns the full [flag object](#flag-object) including targeting rules.

---

## PATCH /v1/projects/{slug}/flags/{key}

Update a flag's metadata or targeting rules.

**Scope:** `mgmt`

::: code-group

```bash [curl]
curl -X PATCH https://api.flagbridge.io/v1/projects/my-app/flags/new-checkout-flow \
  -H "Authorization: Bearer fb_sk_mgmt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Redesigned Checkout",
    "description": "Phase 2 of the checkout redesign"
  }'
```

```typescript [Node.js SDK]
const updated = await adminClient.flags.update('my-app', 'new-checkout-flow', {
  name: 'Redesigned Checkout',
});
```

:::

### Updatable fields

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name |
| `description` | string | Description |
| `rules` | array | Targeting rules (replaces the entire rules array) |
| `variants` | array | Variant definitions |

::: warning
Sending `rules` in a PATCH request replaces all existing targeting rules. To add a single rule, first GET the current rules, append your new rule, then PATCH the full array.
:::

### Response `200 OK`

Returns the updated flag object.

---

## DELETE /v1/projects/{slug}/flags/{key}

Permanently delete a flag and all its per-environment states.

**Scope:** `mgmt`

::: code-group

```bash [curl]
curl -X DELETE https://api.flagbridge.io/v1/projects/my-app/flags/new-checkout-flow \
  -H "Authorization: Bearer fb_sk_mgmt_YOUR_KEY"
```

```typescript [Node.js SDK]
await adminClient.flags.delete('my-app', 'new-checkout-flow');
```

:::

### Response `204 No Content`

This action is irreversible. All flag evaluations for deleted flags return `{ "enabled": false, "reason": "FLAG_NOT_FOUND" }`.

---

## PUT /v1/projects/{slug}/flags/{key}/states/{env}

Set a flag's state for a specific environment. This controls whether the flag is enabled and what percentage rollout applies.

**Scope:** `mgmt`

::: code-group

```bash [Enable in production]
curl -X PUT https://api.flagbridge.io/v1/projects/my-app/flags/new-checkout-flow/states/production \
  -H "Authorization: Bearer fb_sk_mgmt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rolloutPercentage": 25
  }'
```

```bash [Full rollout]
curl -X PUT https://api.flagbridge.io/v1/projects/my-app/flags/new-checkout-flow/states/production \
  -H "Authorization: Bearer fb_sk_mgmt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rolloutPercentage": 100
  }'
```

```typescript [Node.js SDK]
await adminClient.flags.setState('my-app', 'new-checkout-flow', 'production', {
  enabled: true,
  rolloutPercentage: 25,
});
```

:::

### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `enabled` | boolean | Yes | Whether the flag is active in this environment |
| `rolloutPercentage` | number \| null | No | Percentage of users to receive the flag (0–100). `null` means all users |

### Response `200 OK`

```json
{
  "flagKey": "new-checkout-flow",
  "environment": "production",
  "enabled": true,
  "rolloutPercentage": 25,
  "updatedAt": "2026-04-08T00:00:00.000Z"
}
```

---

## GET /v1/projects/{slug}/flags/{key}/states/{env}

Get a flag's current state for a specific environment.

**Scope:** `mgmt`

::: code-group

```bash [curl]
curl https://api.flagbridge.io/v1/projects/my-app/flags/new-checkout-flow/states/production \
  -H "Authorization: Bearer fb_sk_mgmt_YOUR_KEY"
```

```typescript [Node.js SDK]
const state = await adminClient.flags.getState('my-app', 'new-checkout-flow', 'production');
```

:::

### Response `200 OK`

```json
{
  "flagKey": "new-checkout-flow",
  "environment": "production",
  "enabled": true,
  "rolloutPercentage": 25,
  "updatedAt": "2026-04-08T00:00:00.000Z"
}
```

---

## Targeting rules schema

Targeting rules are evaluated top-to-bottom. The first matching rule determines the result.

```json
{
  "rules": [
    {
      "id": "rule_abc123",
      "name": "Beta users",
      "conditions": [
        {
          "attribute": "plan",
          "operator": "equals",
          "value": "pro"
        }
      ],
      "enabled": true,
      "variant": null
    }
  ]
}
```

### Operators

| Operator | Supported types | Example |
|---|---|---|
| `equals` | string, number, boolean | `"plan" equals "pro"` |
| `not_equals` | string, number | `"country" not_equals "US"` |
| `in` | array | `"userId" in ["alice", "bob"]` |
| `not_in` | array | `"plan" not_in ["free"]` |
| `contains` | string | `"email" contains "@company.com"` |
| `starts_with` | string | `"email" starts_with "admin"` |
| `greater_than` | number | `"age" greater_than 18` |
| `less_than` | number | `"score" less_than 50` |
| `is_true` | boolean | `"beta" is_true` |
| `is_false` | boolean | `"verified" is_false` |
