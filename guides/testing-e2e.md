---
title: E2E Testing with Feature Flags
description: Use FlagBridge's built-in Testing API to run isolated, deterministic E2E tests without mocking or environment duplication.
---

# E2E Testing with Feature Flags

Testing feature-flagged code is a known pain point. Most tools force you to either mock the flag SDK, spin up a separate environment, or write conditional test logic that mirrors your flag state. FlagBridge was designed with a different approach.

## Why FlagBridge's Testing API is different

Every major flag platform handles test isolation differently — and most handle it poorly.

| Platform | Testing approach | Problem |
|---|---|---|
| **LaunchDarkly** | No native testing API | You must mock the SDK client in unit tests; E2E requires a dedicated test environment with flags pre-configured via the dashboard |
| **Unleash** | Environment-scoped flag states | No per-test isolation; any flag change affects all traffic hitting that environment during your test run |
| **GrowthBook** | `forcedVariations` SDK option | Works for unit tests; E2E requires custom wrapper setup, manual cleanup, and in-process overrides that bypass network calls |
| **FlagBridge** | Isolated sessions built into the API | Each test gets its own session token. Overrides are scoped to that token — no other user, test, or environment is affected |

FlagBridge's Testing API issues a session token per test run. Any evaluation request that carries that token resolves the overrides you define — ignoring targeting rules, rollout percentages, and the flag's default state. All other traffic is completely unaffected.

::: tip Why this matters
You can run parallel test suites against the same FlagBridge instance without test interference. No dedicated test environments to maintain, no SDK mocking to keep in sync with production behavior.
:::

## How it works

The lifecycle of a test session is four steps:

```
1. Create session  →  POST /v1/testing/sessions
                       Returns a session ID + token

2. Set overrides   →  PUT /v1/testing/sessions/{id}/overrides/{flagKey}
                       Map a flag key to the value you want for this test

3. Run tests       →  Pass X-FlagBridge-Session: {token} on each request
                       Flag evaluations resolve your overrides instead of real rules

4. Cleanup         →  DELETE /v1/testing/sessions/{id}
                       (or let the TTL expire automatically)
```

Sessions default to a 1-hour TTL. If your test runner finishes early, destroy the session explicitly in `afterAll` or teardown hooks.

::: info CE
Basic sessions (create, set override, destroy) are available in Community Edition.
:::

::: warning Pro
TTL control, batch overrides, and per-session metrics are Pro features.
:::

---

## Playwright

### Full test example

```typescript
import { test, expect } from '@playwright/test';
import { FlagBridge } from '@flagbridge/sdk-node';

const fb = new FlagBridge({
  apiKey: 'fb_sk_test_...',
  baseUrl: 'http://localhost:8080',
});

test.describe('New checkout flow', () => {
  let sessionId: string;

  test.beforeAll(async () => {
    const session = await fb.testing.createSession({
      projectId: 'my-project-id',
      label: 'checkout-e2e',
    });
    sessionId = session.id;

    await fb.testing.setOverride(sessionId, {
      flagKey: 'new-checkout',
      value: true,
    });
  });

  test.afterAll(async () => {
    await fb.testing.destroySession(sessionId);
  });

  test('shows new checkout when flag enabled', async ({ page }) => {
    // Pass the session token via header so the app's SDK resolves overrides
    await page.setExtraHTTPHeaders({
      'X-FlagBridge-Session': sessionId,
    });

    await page.goto('/checkout');
    await expect(page.locator('.new-checkout')).toBeVisible();
  });

  test('hides legacy checkout when flag enabled', async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'X-FlagBridge-Session': sessionId,
    });

    await page.goto('/checkout');
    await expect(page.locator('.legacy-checkout')).not.toBeVisible();
  });
});
```

::: tip Forwarding the session header in your app
Your server must forward the `X-FlagBridge-Session` header from incoming requests to the FlagBridge evaluation call. The Node.js SDK picks this up automatically when you pass request headers through the evaluation context.
:::

### Playwright global setup

For large test suites, create sessions in a global setup file and tear them down in global teardown. This avoids per-test HTTP overhead when all tests share the same flag configuration.

```typescript
// playwright/global-setup.ts
import { FlagBridge } from '@flagbridge/sdk-node';

const fb = new FlagBridge({
  apiKey: process.env.FLAGBRIDGE_TEST_KEY!,
  baseUrl: process.env.FLAGBRIDGE_URL!,
});

export default async function globalSetup() {
  const session = await fb.testing.createSession({
    projectId: process.env.FLAGBRIDGE_PROJECT_ID!,
    label: 'playwright-run',
  });

  // Store the session ID so tests can read it via process.env
  process.env.FLAGBRIDGE_SESSION_ID = session.id;
}
```

```typescript
// playwright/global-teardown.ts
import { FlagBridge } from '@flagbridge/sdk-node';

const fb = new FlagBridge({
  apiKey: process.env.FLAGBRIDGE_TEST_KEY!,
  baseUrl: process.env.FLAGBRIDGE_URL!,
});

export default async function globalTeardown() {
  if (process.env.FLAGBRIDGE_SESSION_ID) {
    await fb.testing.destroySession(process.env.FLAGBRIDGE_SESSION_ID);
  }
}
```

---

## Cypress

### Custom commands

```typescript
// cypress/support/commands.ts
import { FlagBridge } from '@flagbridge/sdk-node';

const fb = new FlagBridge({
  apiKey: Cypress.env('FLAGBRIDGE_TEST_KEY'),
  baseUrl: Cypress.env('FLAGBRIDGE_URL') ?? 'http://localhost:8080',
});

let activeSessionId: string | null = null;

Cypress.Commands.add('createFlagSession', (label = 'cypress-session') => {
  return cy.wrap(
    fb.testing.createSession({ label }).then((session) => {
      activeSessionId = session.id;
      // Attach header to all outgoing requests
      cy.intercept('**', (req) => {
        req.headers['X-FlagBridge-Session'] = activeSessionId!;
      });
      return session.id;
    })
  );
});

Cypress.Commands.add('overrideFlag', (flagKey: string, value: boolean | string) => {
  if (!activeSessionId) throw new Error('No active session — call cy.createFlagSession() first');
  return cy.wrap(fb.testing.setOverride(activeSessionId, { flagKey, value }));
});

Cypress.Commands.add('destroyFlagSession', () => {
  if (activeSessionId) {
    return cy.wrap(
      fb.testing.destroySession(activeSessionId).then(() => {
        activeSessionId = null;
      })
    );
  }
});
```

### Writing tests

```typescript
// cypress/e2e/checkout.cy.ts
describe('Checkout flow', () => {
  beforeEach(() => {
    cy.createFlagSession('checkout-test');
  });

  afterEach(() => {
    cy.destroyFlagSession();
  });

  it('shows new checkout when flag is enabled', () => {
    cy.overrideFlag('new-checkout', true);
    cy.visit('/checkout');
    cy.get('[data-testid="checkout-v2"]').should('be.visible');
  });

  it('shows legacy checkout when flag is disabled', () => {
    cy.overrideFlag('new-checkout', false);
    cy.visit('/checkout');
    cy.get('[data-testid="checkout-v1"]').should('be.visible');
  });

  it('applies the correct variant', () => {
    cy.overrideFlag('checkout-button-color', 'green');
    cy.visit('/checkout');
    cy.get('[data-testid="cta-button"]').should('have.class', 'btn-green');
  });
});
```

---

## Vitest / Jest

For unit and integration tests, use the SDK's testing helpers directly — no browser needed.

```typescript
// checkout.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FlagBridge } from '@flagbridge/sdk-node';
import { createCheckoutService } from '../checkout-service';

const fb = new FlagBridge({
  apiKey: process.env.FLAGBRIDGE_TEST_KEY!,
  baseUrl: process.env.FLAGBRIDGE_URL ?? 'http://localhost:8080',
});

describe('CheckoutService with new-checkout flag', () => {
  let sessionId: string;

  beforeAll(async () => {
    const session = await fb.testing.createSession({ label: 'unit-test' });
    sessionId = session.id;
    await fb.testing.setOverride(sessionId, { flagKey: 'new-checkout', value: true });
  });

  afterAll(async () => {
    await fb.testing.destroySession(sessionId);
  });

  it('evaluates flag as enabled via TEST_OVERRIDE', async () => {
    const result = await fb.evaluate('new-checkout', {
      userId: 'test-user',
      sessionId,
    });

    expect(result.enabled).toBe(true);
    expect(result.reason).toBe('TEST_OVERRIDE');
  });

  it('uses new checkout logic when flag is enabled', async () => {
    const service = createCheckoutService({ flagBridgeSessionId: sessionId });
    const summary = await service.buildOrderSummary('order-001');

    expect(summary.layout).toBe('v2');
  });
});
```

::: tip In-process mocks for pure unit tests
When you don't want network calls at all, use `FlagBridge.mock()`. It short-circuits evaluation entirely and is safe for CI environments with no running FlagBridge instance.

```typescript
import { FlagBridge } from '@flagbridge/sdk-node';

const fb = FlagBridge.mock({
  'new-checkout': true,
  'dark-mode': false,
});

const result = await fb.evaluate('new-checkout', { userId: 'test-user' });
// result.enabled === true, result.reason === 'MOCK_OVERRIDE'
```
:::

---

## Session management

### TTL and expiry

Sessions expire automatically. The default TTL is **3600 seconds (1 hour)**. You can increase it up to 24 hours at creation time.

::: info CE
Sessions use the default TTL of 3600s. No TTL customization on creation.
:::

::: warning Pro
Pass a custom `ttl` (up to 86400s) when creating a session. Useful for long nightly test runs.

```typescript
const session = await fb.testing.createSession({
  projectId: 'my-project-id',
  label: 'nightly-run',
  ttl: 28800, // 8 hours
});
```
:::

### Batch overrides

Set multiple overrides in a single API call instead of one request per flag.

::: info CE
Single override per call: `PUT /v1/testing/sessions/{id}/overrides/{flagKey}`.
:::

::: warning Pro
Batch overrides: `PUT /v1/testing/sessions/{id}/overrides/batch` — set all overrides in one request.

```typescript
await fb.testing.setOverrides(sessionId, {
  'new-checkout': true,
  'dark-mode': false,
  'checkout-button-color': 'green',
  'free-shipping-banner': true,
});
```
:::

### Auto-cleanup pattern

Always destroy sessions after tests. Leaked sessions accumulate against your quota.

```typescript
// Safe auto-cleanup helper — destroys the session even if the callback throws
const result = await fb.testing.withSession(
  { label: 'scoped-test' },
  async (session) => {
    await session.override('new-checkout', true);
    return runMyTests(session.id);
  }
);
// session is destroyed when the callback resolves or rejects
```

---

## Related

- [Testing API reference](/api-reference/testing) — full endpoint documentation
- [Authentication](/api-reference/authentication) — test key scope (`fb_sk_test_*`)
- [Evaluation](/api-reference/evaluation) — `TEST_OVERRIDE` reason and session header behavior
