---
title: Testes E2E com Feature Flags
description: Use a Testing API nativa do FlagBridge para criar testes E2E isolados e determinísticos sem mocks ou ambientes duplicados.
---

# Testes E2E com Feature Flags

Testar código controlado por feature flags é um problema conhecido. A maioria das ferramentas obriga você a mockar o SDK, subir um ambiente separado ou escrever lógica condicional nos testes que espelha o estado das flags. O FlagBridge foi projetado de forma diferente.

## Por que a Testing API do FlagBridge é diferente

Cada plataforma de flags lida com isolamento de testes de uma maneira — e a maioria lida mal.

| Plataforma | Abordagem para testes | Problema |
|---|---|---|
| **LaunchDarkly** | Sem Testing API nativa | É preciso mockar o SDK nos testes unitários; testes E2E exigem um ambiente dedicado com flags pré-configuradas no dashboard |
| **Unleash** | Estados de flag por environment | Sem isolamento por teste; qualquer mudança de flag afeta todo o tráfego do environment durante a execução |
| **GrowthBook** | Opção `forcedVariations` no SDK | Funciona em testes unitários; E2E requer setup customizado e overrides em processo que não exercitam o comportamento real de rede |
| **FlagBridge** | Sessions isoladas nativas da API | Cada teste recebe seu próprio token de session. Os overrides ficam escopados a esse token — nenhum outro usuário ou teste é afetado |

A Testing API do FlagBridge emite um token de session por execução de teste. Qualquer requisição de avaliação que carregue esse token resolve os overrides que você definiu — ignorando regras de targeting, percentuais de rollout e o estado padrão da flag. Todo o restante do tráfego fica completamente inalterado.

::: tip Por que isso importa
Você pode executar suítes de testes em paralelo contra a mesma instância do FlagBridge sem interferência entre eles. Sem environments de teste para manter, sem mocks para sincronizar com o comportamento de produção.
:::

## Como funciona

O ciclo de vida de uma test session tem quatro etapas:

```
1. Criar session  →  POST /v1/testing/sessions
                      Retorna um ID de session + token

2. Definir overrides  →  PUT /v1/testing/sessions/{id}/overrides/{flagKey}
                          Mapeia uma flag key para o valor desejado neste teste

3. Executar testes  →  Passar X-FlagBridge-Session: {token} em cada requisição
                        As avaliações de flag resolvem seus overrides

4. Cleanup  →  DELETE /v1/testing/sessions/{id}
               (ou aguardar o TTL expirar automaticamente)
```

Sessions expiram em 1 hora por padrão. Se o test runner terminar antes, destrua a session explicitamente no `afterAll` ou hook de teardown.

::: info CE
Sessions básicas (criar, definir override, destruir) estão disponíveis na Community Edition.
:::

::: warning Pro
Controle de TTL, batch overrides e métricas por session são recursos Pro.
:::

---

## Playwright

### Exemplo completo

```typescript
import { test, expect } from '@playwright/test';
import { FlagBridge } from '@flagbridge/sdk-node';

const fb = new FlagBridge({
  apiKey: 'fb_sk_test_...',
  baseUrl: 'http://localhost:8080',
});

test.describe('Novo fluxo de checkout', () => {
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

  test('exibe o novo checkout quando a flag está habilitada', async ({ page }) => {
    // Passa o token de session via header para o SDK da aplicação resolver os overrides
    await page.setExtraHTTPHeaders({
      'X-FlagBridge-Session': sessionId,
    });

    await page.goto('/checkout');
    await expect(page.locator('.new-checkout')).toBeVisible();
  });

  test('esconde o checkout legado quando a flag está habilitada', async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'X-FlagBridge-Session': sessionId,
    });

    await page.goto('/checkout');
    await expect(page.locator('.legacy-checkout')).not.toBeVisible();
  });
});
```

::: tip Repassando o header na sua aplicação
O servidor precisa repassar o header `X-FlagBridge-Session` da requisição recebida para a chamada de avaliação do FlagBridge. O SDK Node.js faz isso automaticamente quando você configura o repasse de headers no contexto de avaliação.
:::

### Setup global do Playwright

Para suítes grandes, crie sessions no arquivo de setup global e destrua no teardown global. Isso evita overhead de HTTP por teste quando todos compartilham a mesma configuração de flags.

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
      cy.intercept('**', (req) => {
        req.headers['X-FlagBridge-Session'] = activeSessionId!;
      });
      return session.id;
    })
  );
});

Cypress.Commands.add('overrideFlag', (flagKey: string, value: boolean | string) => {
  if (!activeSessionId) throw new Error('Sem session ativa — chame cy.createFlagSession() primeiro');
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

### Escrevendo testes

```typescript
// cypress/e2e/checkout.cy.ts
describe('Fluxo de checkout', () => {
  beforeEach(() => {
    cy.createFlagSession('checkout-test');
  });

  afterEach(() => {
    cy.destroyFlagSession();
  });

  it('exibe o novo checkout quando a flag está habilitada', () => {
    cy.overrideFlag('new-checkout', true);
    cy.visit('/checkout');
    cy.get('[data-testid="checkout-v2"]').should('be.visible');
  });

  it('exibe o checkout legado quando a flag está desabilitada', () => {
    cy.overrideFlag('new-checkout', false);
    cy.visit('/checkout');
    cy.get('[data-testid="checkout-v1"]').should('be.visible');
  });

  it('aplica a variante correta', () => {
    cy.overrideFlag('checkout-button-color', 'green');
    cy.visit('/checkout');
    cy.get('[data-testid="cta-button"]').should('have.class', 'btn-green');
  });
});
```

---

## Vitest / Jest

Para testes unitários e de integração, use os helpers de teste do SDK diretamente — sem browser necessário.

```typescript
// checkout.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FlagBridge } from '@flagbridge/sdk-node';
import { createCheckoutService } from '../checkout-service';

const fb = new FlagBridge({
  apiKey: process.env.FLAGBRIDGE_TEST_KEY!,
  baseUrl: process.env.FLAGBRIDGE_URL ?? 'http://localhost:8080',
});

describe('CheckoutService com flag new-checkout', () => {
  let sessionId: string;

  beforeAll(async () => {
    const session = await fb.testing.createSession({ label: 'unit-test' });
    sessionId = session.id;
    await fb.testing.setOverride(sessionId, { flagKey: 'new-checkout', value: true });
  });

  afterAll(async () => {
    await fb.testing.destroySession(sessionId);
  });

  it('avalia a flag como habilitada via TEST_OVERRIDE', async () => {
    const result = await fb.evaluate('new-checkout', {
      userId: 'test-user',
      sessionId,
    });

    expect(result.enabled).toBe(true);
    expect(result.reason).toBe('TEST_OVERRIDE');
  });

  it('usa a lógica do novo checkout quando a flag está habilitada', async () => {
    const service = createCheckoutService({ flagBridgeSessionId: sessionId });
    const summary = await service.buildOrderSummary('order-001');

    expect(summary.layout).toBe('v2');
  });
});
```

::: tip Mocks em processo para testes unitários puros
Quando você não quer chamadas de rede, use `FlagBridge.mock()`. Ele curto-circuita a avaliação e é seguro para ambientes CI sem uma instância FlagBridge rodando.

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

## Gerenciamento de sessions

### TTL e expiração

Sessions expiram automaticamente. O TTL padrão é **3600 segundos (1 hora)**. Você pode aumentar para até 24 horas no momento da criação.

::: info CE
Sessions usam o TTL padrão de 3600s. Sem personalização de TTL na criação.
:::

::: warning Pro
Passe um `ttl` customizado (até 86400s) ao criar a session. Útil para execuções de testes noturnos.

```typescript
const session = await fb.testing.createSession({
  projectId: 'my-project-id',
  label: 'nightly-run',
  ttl: 28800, // 8 horas
});
```
:::

### Batch overrides

Defina múltiplos overrides em uma única chamada à API.

::: info CE
Um override por chamada: `PUT /v1/testing/sessions/{id}/overrides/{flagKey}`.
:::

::: warning Pro
Batch overrides: `PUT /v1/testing/sessions/{id}/overrides/batch` — define todos os overrides em uma única requisição.

```typescript
await fb.testing.setOverrides(sessionId, {
  'new-checkout': true,
  'dark-mode': false,
  'checkout-button-color': 'green',
  'free-shipping-banner': true,
});
```
:::

### Padrão de limpeza automática

Sempre destrua sessions após os testes. Sessions vazadas acumulam contra sua cota.

```typescript
// Helper de limpeza segura — destrói a session mesmo se o callback lançar erro
const result = await fb.testing.withSession(
  { label: 'scoped-test' },
  async (session) => {
    await session.override('new-checkout', true);
    return runMyTests(session.id);
  }
);
// session é destruída quando o callback resolve ou rejeita
```

---

## Leia também

- [Referência da Testing API](/pt-br/api-reference/testing) — documentação completa dos endpoints
- [Autenticação](/pt-br/api-reference/authentication) — escopo test key (`fb_sk_test_*`)
- [Avaliação](/pt-br/api-reference/evaluation) — razão `TEST_OVERRIDE` e comportamento do header de session
