---
title: Testing API
description: Crie test sessions isoladas com overrides por flag para testes E2E e de integração.
---

# Testing API

A Testing API permite criar sessions isoladas com overrides por flag. Cada session tem um token que, quando incluído nas requisições de avaliação via `X-FlagBridge-Session`, aplica os overrides que você definiu — sem afetar nenhum outro usuário ou execução de teste.

Esta é a base do suporte a testes E2E do FlagBridge. Veja o [guia de testes E2E](/pt-br/guides/testing-e2e) para exemplos completos com Playwright, Cypress e Vitest.

**Auth:** Escopo `test` ou `full` necessário para todos os endpoints de testing.

---

## POST /v1/testing/sessions {#create-session}

Cria uma nova test session.

```
POST /v1/testing/sessions
Authorization: Bearer fb_sk_test_SUA_KEY
Content-Type: application/json
```

### Corpo da requisição {#create-session-body}

```json
{
  "projectId": "proj_abc123",
  "label": "checkout-e2e",
  "ttl": 3600
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `projectId` | string | Sim | ID do projeto ao qual a session pertence |
| `label` | string | Não | Label legível para debug e logs de auditoria |
| `ttl` | number | Não | Tempo de vida da session em segundos (padrão: 3600). **Somente Pro** — CE ignora este campo e sempre usa 3600. Máx: 86400 |

::: info CE
`ttl` é ignorado na Community Edition. Todas as sessions usam o TTL padrão de 3600s.
:::

::: warning Pro
Passe qualquer valor de `ttl` entre 1 e 86400 para controlar o tempo de vida da session. Útil para execuções de testes noturnos.
:::

### Resposta `201 Created` {#create-session-response}

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

O `id` é usado para gerenciar a session. O `token` é o que você passa no header `X-FlagBridge-Session` nas requisições de avaliação.

::: code-group

```bash [curl]
curl -X POST https://api.flagbridge.io/v1/testing/sessions \
  -H "Authorization: Bearer fb_sk_test_SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_abc123",
    "label": "checkout-e2e"
  }'
```

```typescript [SDK Node.js]
const session = await fb.testing.createSession({
  projectId: 'proj_abc123',
  label: 'checkout-e2e',
});

console.log(session.id);    // sess_abc123
console.log(session.token); // passe no header X-FlagBridge-Session
```

:::

---

## GET /v1/testing/sessions/{id} {#get-session}

Busca o estado atual de uma session, incluindo todos os overrides ativos.

```
GET /v1/testing/sessions/{id}
Authorization: Bearer fb_sk_test_SUA_KEY
```

::: code-group

```bash [curl]
curl https://api.flagbridge.io/v1/testing/sessions/sess_abc123 \
  -H "Authorization: Bearer fb_sk_test_SUA_KEY"
```

```typescript [SDK Node.js]
const session = await fb.testing.getSession('sess_abc123');
console.log(session.overrides);
```

:::

### Resposta `200 OK` {#get-session-response}

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

Destrói uma session antes do seu TTL expirar. Sempre chame isso ao final do seu test run para liberar recursos e evitar acúmulo.

```
DELETE /v1/testing/sessions/{id}
Authorization: Bearer fb_sk_test_SUA_KEY
```

::: code-group

```bash [curl]
curl -X DELETE https://api.flagbridge.io/v1/testing/sessions/sess_abc123 \
  -H "Authorization: Bearer fb_sk_test_SUA_KEY"
```

```typescript [SDK Node.js]
await fb.testing.destroySession('sess_abc123');
```

:::

### Resposta `204 No Content` {#delete-session-response}

Após a destruição, qualquer requisição de avaliação que carregue o token da session resolve normalmente (ignorando os overrides).

---

## PUT /v1/testing/sessions/{id}/overrides/{flagKey} {#set-override}

Define ou atualiza o override de uma flag específica em uma session. Se a flag já tem um override, ele é substituído.

```
PUT /v1/testing/sessions/{id}/overrides/{flagKey}
Authorization: Bearer fb_sk_test_SUA_KEY
Content-Type: application/json
```

### Corpo da requisição {#set-override-body}

```json
{
  "value": true
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `value` | boolean \| string | Sim | Valor do override. Use `true`/`false` para flags booleanas; uma string para flags multi-variante |

::: code-group

```bash [Flag booleana]
curl -X PUT https://api.flagbridge.io/v1/testing/sessions/sess_abc123/overrides/new-checkout \
  -H "Authorization: Bearer fb_sk_test_SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"value": true}'
```

```bash [Flag multi-variante]
curl -X PUT https://api.flagbridge.io/v1/testing/sessions/sess_abc123/overrides/checkout-button-color \
  -H "Authorization: Bearer fb_sk_test_SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"value": "green"}'
```

```typescript [SDK Node.js]
await fb.testing.setOverride('sess_abc123', {
  flagKey: 'new-checkout',
  value: true,
});
```

:::

### Resposta `200 OK` {#set-override-response}

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

Define múltiplos overrides em uma única requisição.

::: warning Pro
Batch overrides são um recurso Pro. A Community Edition deve chamar o endpoint de override individual para cada flag.
:::

```
PUT /v1/testing/sessions/{id}/overrides/batch
Authorization: Bearer fb_sk_test_SUA_KEY
Content-Type: application/json
```

### Corpo da requisição {#batch-overrides-body}

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

Cada chave é uma flag key. Os valores podem ser `boolean` ou `string`. Esta chamada **mescla** com os overrides existentes — não os substitui. Para limpar todos os overrides, destrua e recrie a session.

::: code-group

```bash [curl]
curl -X PUT https://api.flagbridge.io/v1/testing/sessions/sess_abc123/overrides/batch \
  -H "Authorization: Bearer fb_sk_test_SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "overrides": {
      "new-checkout": true,
      "checkout-button-color": "green",
      "dark-mode": false
    }
  }'
```

```typescript [SDK Node.js]
await fb.testing.setOverrides('sess_abc123', {
  'new-checkout': true,
  'checkout-button-color': 'green',
  'dark-mode': false,
});
```

:::

### Resposta `200 OK` {#batch-overrides-response}

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

Remove o override de uma flag específica de uma session. Após a remoção, essa flag avalia normalmente para requisições que usam este token de session.

```
DELETE /v1/testing/sessions/{id}/overrides/{flagKey}
Authorization: Bearer fb_sk_test_SUA_KEY
```

::: code-group

```bash [curl]
curl -X DELETE https://api.flagbridge.io/v1/testing/sessions/sess_abc123/overrides/new-checkout \
  -H "Authorization: Bearer fb_sk_test_SUA_KEY"
```

```typescript [SDK Node.js]
await fb.testing.deleteOverride('sess_abc123', 'new-checkout');
```

:::

### Resposta `204 No Content` {#delete-override-response}

---

## Usando uma session na avaliação

Passe o token de session no header `X-FlagBridge-Session` em qualquer requisição de avaliação:

```bash
curl -X POST https://api.flagbridge.io/v1/evaluate \
  -H "Authorization: Bearer fb_sk_test_SUA_KEY" \
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
Os overrides de test session têm a maior precedência na [ordem de resolução](/pt-br/api-reference/evaluation#ordem-de-resolucao). Eles sobrescrevem regras de targeting, rollouts por percentual e o estado padrão da flag. Usuários sem o token de session são completamente inafetados.
:::

---

## Leia também

- [Guia de testes E2E](/pt-br/guides/testing-e2e) — exemplos completos com Playwright, Cypress e Vitest
- [API de Avaliação](/pt-br/api-reference/evaluation) — ordem de resolução e razão `TEST_OVERRIDE`
- [Autenticação](/pt-br/api-reference/authentication) — escopo `test` key (`fb_sk_test_*`)
