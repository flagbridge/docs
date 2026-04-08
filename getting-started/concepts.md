---
title: Core Concepts
description: Understand projects, environments, flags, flag states, targeting rules, API keys, evaluation order, and testing sessions in FlagBridge.
---

# Core Concepts

FlagBridge is built around a small set of composable concepts. Understanding them upfront makes flag architecture decisions easier and avoids common pitfalls.

## Projects

A **project** is the top-level container for flags, environments, and API keys. In most cases, one project maps to one application or service.

```
my-org
├── project: web-app
│   ├── environments: production, staging, development
│   └── flags: new-checkout-flow, dark-mode, sidebar-v2
└── project: mobile-app
    ├── environments: production, staging, development
    └── flags: biometric-login, new-onboarding
```

Projects are isolated — flags, environments, and API keys in one project have no relationship to those in another.

## Environments

**Environments** let you control flags independently across deployment stages. Every project is created with three default environments:

| Environment | Typical use |
|---|---|
| `production` | Live user traffic |
| `staging` | Pre-release validation |
| `development` | Local development |

A flag enabled in `staging` has no effect on `production`. You can test targeting rules, rollout percentages, and new flag behavior in lower environments before promoting to production.

::: tip
You can create additional environments (e.g. `preview`, `canary`) from the project settings.
:::

## Flags

A **flag** is a named, typed feature toggle. FlagBridge supports three flag types:

| Type | Example value | Use case |
|---|---|---|
| `boolean` | `true` / `false` | Feature on/off |
| `string` | `"v2"`, `"blue"` | A/B variants, config values |
| `number` | `0.15`, `42` | Rollout percentages, limits |

Each flag has:

- **Key** — the unique identifier used in your code (e.g., `new-checkout-flow`). Immutable after creation. Use kebab-case.
- **Name** — human-readable label shown in the UI.
- **Type** — `boolean`, `string`, or `number`.
- **Default value** — the value returned when no rule matches and the flag is enabled.

Flag keys are stable identifiers — changing them would break all SDK calls referencing the old key.

## Flag States

**Flag state** is per-environment. The same flag can be enabled in `staging` and disabled in `production` simultaneously.

Each environment state contains:

- `enabled` — whether the flag is active in that environment
- `value` — the default value when no targeting rule matches
- `rules` — the list of targeting rules for that environment

```json
{
  "key": "new-checkout-flow",
  "environments": {
    "production": {
      "enabled": false,
      "value": false,
      "rules": []
    },
    "staging": {
      "enabled": true,
      "value": true,
      "rules": [
        { "id": "rule_abc", "condition": {"attribute": "plan", "operator": "eq", "value": "beta"} }
      ]
    }
  }
}
```

Disabling a flag at the environment level causes evaluation to immediately return the flag's disabled state for all users in that environment, regardless of targeting rules.

## Targeting Rules

**Targeting rules** let you enable a flag for a subset of users without enabling it for everyone. Rules are evaluated in priority order — the first rule that matches determines the result.

Each rule contains:

- **Conditions** — one or more attribute checks
- **Operator** — how conditions are combined (`AND` / `OR`)
- **Value** — the flag value to return when this rule matches
- **Priority** — evaluation order (lower number = evaluated first)

### Supported operators

| Operator | Description |
|---|---|
| `eq` | Equals |
| `neq` | Not equals |
| `in` | Value is in a list |
| `not_in` | Value is not in a list |
| `contains` | String contains substring |
| `gt` / `gte` | Greater than / greater than or equal |
| `lt` / `lte` | Less than / less than or equal |
| `exists` | Attribute is present in context |

### Example rule

Enable a flag for users on the `beta` plan in Brazil:

```json
{
  "conditions": [
    { "attribute": "plan", "operator": "eq", "value": "beta" },
    { "attribute": "country", "operator": "eq", "value": "BR" }
  ],
  "operator": "AND",
  "value": true,
  "priority": 1
}
```

The **evaluation context** is the set of attributes your app passes when calling the evaluate endpoint. Any attribute can be used in rules — common ones are `userId`, `email`, `country`, `plan`, and `orgId`.

::: info
Context attributes are used only for rule evaluation. FlagBridge does not store or index them unless you enable analytics integrations.
:::

## API Keys

API keys authenticate requests to FlagBridge. Each key has a **scope** that limits what it can do:

| Scope | Description | Typical use |
|---|---|---|
| `eval` | Evaluate flags only | SDK instances in production apps |
| `test` | Evaluate flags + manage testing sessions | E2E test runners |
| `mgmt` | Full management access (no evaluation) | CI/CD pipelines, admin scripts |
| `full` | Evaluation + management | Development environments only |

::: warning
Never use a `full` or `mgmt` key in client-side code. Use `eval` keys in browsers and mobile apps.
:::

Keys are also scoped to a specific **project** and **environment**. An `eval` key for `my-app/production` cannot evaluate flags in `my-app/staging`.

## Evaluation

When your app calls the evaluate endpoint, FlagBridge resolves the flag value using this precedence order:

```
1. Testing session override  → highest priority, always wins
2. Targeting rules           → evaluated in priority order, first match wins
3. Percentage rollout        → applied if no targeting rule matched
4. Environment default       → the flag's default value for this environment
5. Flag default              → the flag's global default value
```

### Evaluation reasons

The API always returns a `reason` field explaining how the value was resolved:

| Reason | Description |
|---|---|
| `TEST_OVERRIDE` | Overridden by a testing session |
| `TARGETING_RULE_MATCH` | A targeting rule matched |
| `PERCENTAGE_ROLLOUT` | Included in percentage rollout |
| `PERCENTAGE_ROLLOUT_EXCLUDED` | Excluded from percentage rollout |
| `FLAG_ENABLED` | Flag is on with no rules — returning default value |
| `FLAG_DISABLED` | Flag is disabled for this environment |
| `FLAG_NOT_FOUND` | Flag key does not exist (returns disabled) |

Use the `reason` field during debugging to understand exactly why a user got a particular value.

### Percentage rollouts

Percentage rollouts use a consistent hash of `userId` to decide inclusion. A 20% rollout always includes the same 20% of users. Increasing the percentage adds users — it never removes previously included users (monotonic).

## Testing Sessions

**Testing sessions** allow E2E tests to override flag values in isolation without affecting real traffic. Each session gets a unique token. Any evaluate request that includes the session token header will receive the overrides defined for that session.

This lets you write deterministic tests:

```bash
# 1. Create a testing session
curl -X POST http://localhost:8080/v1/testing-sessions \
  -H "Authorization: Bearer fb_sk_test_..." \
  -H "Content-Type: application/json" \
  -d '{
    "projectSlug": "my-app",
    "environment": "staging",
    "overrides": {
      "new-checkout-flow": true,
      "dark-mode": false
    }
  }'
# Returns: {"token": "sess_abc123", ...}

# 2. Use the session token in evaluate requests
curl -X POST http://localhost:8080/v1/evaluate \
  -H "Authorization: Bearer fb_sk_test_..." \
  -H "X-FlagBridge-Session: sess_abc123" \
  -H "Content-Type: application/json" \
  -d '{"flagKey": "new-checkout-flow", "context": {"userId": "test-user"}}'
# Returns: {"enabled": true, "reason": "TEST_OVERRIDE"}

# 3. Delete the session when the test run is done
curl -X DELETE http://localhost:8080/v1/testing-sessions/sess_abc123 \
  -H "Authorization: Bearer fb_sk_test_..."
```

Sessions are isolated — overrides in one session have no effect on requests without that session token, and no effect on other sessions.

::: tip
See the [Testing API reference](/api-reference/testing) for the full session lifecycle, including how to pass the session token through your test framework and SDK.
:::
