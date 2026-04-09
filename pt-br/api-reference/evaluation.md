---
title: Avaliação
description: "POST /evaluate e /evaluate/batch — avalie feature flags para um contexto de usuário, com ordem de resolução e referência completa de campos."
---

# Avaliação

Os endpoints de avaliação são o núcleo do FlagBridge. Eles determinam se uma flag está habilitada para um dado contexto de usuário, aplicando regras de targeting, percentuais de rollout e overrides de teste em uma ordem de resolução definida.

**Auth:** Escopo `eval`, `test` ou `full`.

---

## POST /v1/evaluate

Avalia uma única flag para um contexto de usuário.

```
POST /v1/evaluate
Authorization: Bearer fb_sk_eval_SUA_KEY
Content-Type: application/json
```

### Corpo da requisição {#evaluate-body}

```json
{
  "flagKey": "new-checkout-flow",
  "context": {
    "userId": "user-123",
    "email": "usuario@exemplo.com",
    "country": "BR",
    "plan": "pro"
  }
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `flagKey` | string | Sim | Key única da flag |
| `context` | object | Não | Atributos de contexto da avaliação (qualquer par chave-valor) |
| `context.userId` | string | Não | Identificador único do usuário — necessário para bucketing consistente em rollouts por percentual |

### Resposta `200 OK` {#evaluate-response}

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

| Campo | Tipo | Descrição |
|---|---|---|
| `flagKey` | string | A key da flag avaliada |
| `enabled` | boolean | Se a flag está habilitada para este contexto |
| `variant` | string \| null | Valor da variante para flags multi-variante; `null` para flags booleanas |
| `reason` | string | Por que a flag resolveu para este valor (veja abaixo) |
| `ruleId` | string \| null | ID da regra de targeting correspondente, se aplicável |
| `evaluatedAt` | string | Timestamp ISO 8601 da avaliação |

### Exemplos

::: code-group

```bash [curl]
curl -X POST https://api.flagbridge.io/v1/evaluate \
  -H "Authorization: Bearer fb_sk_eval_SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "new-checkout-flow",
    "context": {
      "userId": "user-123",
      "plan": "pro"
    }
  }'
```

```typescript [SDK Node.js]
const resultado = await client.evaluate('new-checkout-flow', {
  userId: 'user-123',
  plan: 'pro',
});

console.log(resultado.enabled); // true
console.log(resultado.reason);  // 'TARGETING_RULE_MATCH'
```

:::

---

## POST /v1/evaluate/batch

Avalia múltiplas flags em uma única requisição. Usa um único round-trip de rede em vez de um por flag.

```
POST /v1/evaluate/batch
Authorization: Bearer fb_sk_eval_SUA_KEY
Content-Type: application/json
```

### Corpo da requisição {#batch-evaluate-body}

```json
{
  "flags": ["new-checkout-flow", "dark-mode", "sidebar-v2"],
  "context": {
    "userId": "user-123",
    "plan": "pro"
  }
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `flags` | string[] | Sim | Array de keys de flags para avaliar (máx: 50 por requisição) |
| `context` | object | Não | Contexto de avaliação aplicado a todas as flags do batch |

### Resposta `200 OK` {#batch-evaluate-response}

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

### Exemplos

::: code-group

```bash [curl]
curl -X POST https://api.flagbridge.io/v1/evaluate/batch \
  -H "Authorization: Bearer fb_sk_eval_SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flags": ["new-checkout-flow", "dark-mode", "sidebar-v2"],
    "context": { "userId": "user-123", "plan": "pro" }
  }'
```

```typescript [SDK Node.js]
const resultados = await client.evaluateBatch(
  ['new-checkout-flow', 'dark-mode', 'sidebar-v2'],
  { userId: 'user-123', plan: 'pro' }
);

resultados['new-checkout-flow'].enabled; // true
resultados['dark-mode'].enabled;         // false
resultados['sidebar-v2'].variant;        // 'compact'
```

:::

::: info
Prefira o batch em vez de múltiplas chamadas individuais a `evaluate` quando precisar de várias flags ao mesmo tempo — especialmente em páginas renderizadas no servidor, onde cada requisição extra adiciona latência.
:::

---

## Ordem de resolução

Quando uma requisição de avaliação chega, o FlagBridge resolve o resultado nesta ordem:

1. **Override de test session** — se a requisição inclui um header `X-FlagBridge-Session` com um token de session válido, e essa session tem um override para esta flag, o override vence imediatamente. Nenhuma outra regra é verificada.

2. **Flag desabilitada** — se a flag está globalmente desabilitada para o environment, retorna `enabled: false` com razão `FLAG_DISABLED`.

3. **Regras de targeting** — avalia as regras de cima para baixo. A primeira regra correspondente determina o resultado. Retorna `TARGETING_RULE_MATCH`.

4. **Rollout por percentual** — se um percentual de rollout está definido e nenhuma regra correspondeu, faz o bucketing do usuário pelo hash do `userId`. Retorna `PERCENTAGE_ROLLOUT` (incluído) ou `PERCENTAGE_ROLLOUT_EXCLUDED` (excluído).

5. **Flag habilitada globalmente** — se a flag está habilitada sem regras de targeting e sem rollout, todos os usuários recebem `enabled: true`. Retorna `FLAG_ENABLED`.

6. **Flag não encontrada** — se a key da flag não existe, retorna `enabled: false` com razão `FLAG_NOT_FOUND`. Nunca lança erro.

### Razões de avaliação

| Razão | Descrição |
|---|---|
| `TEST_OVERRIDE` | Sobrescrito por uma test session ativa |
| `FLAG_DISABLED` | Flag desabilitada para este environment |
| `TARGETING_RULE_MATCH` | Uma condição de regra de targeting correspondeu ao contexto |
| `PERCENTAGE_ROLLOUT` | Usuário incluído no rollout por percentual |
| `PERCENTAGE_ROLLOUT_EXCLUDED` | Usuário excluído do rollout por percentual |
| `FLAG_ENABLED` | Flag globalmente habilitada sem regras adicionais |
| `FLAG_NOT_FOUND` | Key da flag não existe neste projeto |

---

## Header de test session

Para testes E2E, passe o token de session no header `X-FlagBridge-Session`. Isso ativa os overrides de teste para aquela requisição sem afetar nenhum outro tráfego.

::: code-group

```bash [curl]
curl -X POST https://api.flagbridge.io/v1/evaluate \
  -H "Authorization: Bearer fb_sk_test_SUA_KEY" \
  -H "X-FlagBridge-Session: sess_abc123" \
  -H "Content-Type: application/json" \
  -d '{"flagKey": "new-checkout-flow", "context": {"userId": "test-user"}}'
```

```typescript [SDK Node.js]
// O SDK lê X-FlagBridge-Session da requisição recebida automaticamente
// quando configurado com repasse de headers habilitado
const resultado = await client.evaluate('new-checkout-flow', {
  userId: 'test-user',
  _sessionId: req.headers['x-flagbridge-session'],
});
```

:::

A resposta incluirá `"reason": "TEST_OVERRIDE"` quando um override de session estiver ativo.

Veja a [Testing API](/pt-br/api-reference/testing) para criar sessions e definir overrides.
