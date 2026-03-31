---
title: Avaliação
description: "POST /evaluate e /evaluate/batch — avalie feature flags para um contexto de usuário."
---

# Avaliação

Os endpoints de avaliação são o núcleo do FlagBridge. Eles determinam se uma flag está habilitada para um dado contexto de usuário.

## POST /v1/evaluate

Avalia uma única flag.

**Auth:** Live key, Test key ou Admin key

### Corpo da requisição

```json
{
  "flagKey": "novo-checkout",
  "context": {
    "userId": "user-123",
    "country": "BR",
    "plan": "pro"
  }
}
```

### Resposta

```json
{
  "flagKey": "novo-checkout",
  "enabled": true,
  "variant": null,
  "reason": "TARGETING_RULE_MATCH",
  "ruleId": "rule_abc123",
  "evaluatedAt": "2026-03-31T20:00:00.000Z"
}
```

### Razões de avaliação

| Razão | Descrição |
|---|---|
| `FLAG_DISABLED` | Flag globalmente desabilitada |
| `FLAG_ENABLED` | Flag globalmente habilitada (sem regras) |
| `TARGETING_RULE_MATCH` | Uma regra de targeting correspondeu |
| `PERCENTAGE_ROLLOUT` | Incluído no rollout por porcentagem |
| `PERCENTAGE_ROLLOUT_EXCLUDED` | Excluído do rollout por porcentagem |
| `TEST_OVERRIDE` | Sobrescrito por uma sessão de teste |
| `FLAG_NOT_FOUND` | Flag não existe (retorna `enabled: false`) |

### Exemplos

::: code-group
```bash [curl]
curl -X POST https://api.flagbridge.io/v1/evaluate \
  -H "Authorization: Bearer fb_live_SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "novo-checkout",
    "context": { "userId": "user-123", "plan": "pro" }
  }'
```

```typescript [SDK Node.js]
const resultado = await client.evaluate('novo-checkout', {
  userId: 'user-123',
  plan: 'pro',
});
```
:::

---

## POST /v1/evaluate/batch

Avalia múltiplas flags em uma única requisição.

### Corpo da requisição

```json
{
  "flags": ["novo-checkout", "modo-escuro", "sidebar-v2"],
  "context": { "userId": "user-123" }
}
```

### Resposta

```json
{
  "results": {
    "novo-checkout": { "enabled": true, "reason": "TARGETING_RULE_MATCH" },
    "modo-escuro": { "enabled": false, "reason": "FLAG_DISABLED" },
    "sidebar-v2": { "enabled": true, "variant": "compacto", "reason": "PERCENTAGE_ROLLOUT" }
  },
  "evaluatedAt": "2026-03-31T20:00:00.000Z"
}
```

::: info
Prefira o batch quando precisar de várias flags ao mesmo tempo — usa apenas um round-trip de rede.
:::

## Header de sessão de teste

Para testes E2E, passe o token da sessão no header `X-FlagBridge-Session`.
Veja a [API de Testing](/pt-br/api-reference/testing) para criar sessões.
