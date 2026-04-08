---
title: Flags
description: Endpoints CRUD para gerenciar feature flags — criar, listar, buscar, atualizar, deletar e controlar estado por environment.
---

# Flags

Endpoints de gerenciamento de flags para criar, ler, atualizar e deletar feature flags dentro de um projeto, além de controlar o estado por environment.

**Auth:** Escopo `mgmt` ou `full` necessário para todos os endpoints de gerenciamento de flags.

## Objeto flag

```json
{
  "id": "flag_abc123",
  "key": "new-checkout-flow",
  "name": "Novo Fluxo de Checkout",
  "description": "Ativa a experiência de checkout redesenhada",
  "variants": [],
  "rules": [],
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-04-08T00:00:00.000Z"
}
```

O estado da flag (habilitada/desabilitada, percentual de rollout) é por environment. Veja [Definir estado](#put-v1projectsslugflagskeystatusenv) abaixo.

---

## POST /v1/projects/{slug}/flags

Cria uma nova flag.

**Escopo:** `mgmt`

::: code-group

```bash [curl]
curl -X POST https://api.flagbridge.io/v1/projects/meu-app/flags \
  -H "Authorization: Bearer fb_sk_mgmt_SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new-checkout-flow",
    "name": "Novo Fluxo de Checkout",
    "description": "Ativa a experiência de checkout redesenhada"
  }'
```

```typescript [SDK Node.js]
const flag = await adminClient.flags.create('meu-app', {
  key: 'new-checkout-flow',
  name: 'Novo Fluxo de Checkout',
  description: 'Ativa a experiência de checkout redesenhada',
});
```

:::

### Corpo da requisição

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `key` | string | Sim | Chave única da flag (kebab-case, imutável após a criação) |
| `name` | string | Sim | Nome legível para exibição |
| `description` | string | Não | Descrição opcional |
| `variants` | array | Não | Definições de variantes para flags multi-variante |

### Resposta `201 Created`

```json
{
  "id": "flag_abc123",
  "key": "new-checkout-flow",
  "name": "Novo Fluxo de Checkout",
  "description": "Ativa a experiência de checkout redesenhada",
  "variants": [],
  "rules": [],
  "createdAt": "2026-04-08T00:00:00.000Z",
  "updatedAt": "2026-04-08T00:00:00.000Z"
}
```

---

## GET /v1/projects/{slug}/flags

Lista todas as flags de um projeto.

**Escopo:** `mgmt`

::: code-group

```bash [curl]
curl https://api.flagbridge.io/v1/projects/meu-app/flags \
  -H "Authorization: Bearer fb_sk_mgmt_SUA_KEY"
```

```typescript [SDK Node.js]
const { flags, total } = await adminClient.flags.list('meu-app');
```

:::

### Parâmetros de query

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `environment` | string | Filtrar por slug de environment |
| `q` | string | Buscar por key ou nome |
| `page` | number | Número da página (padrão: 1) |
| `perPage` | number | Resultados por página (padrão: 20, máx: 100) |

### Resposta `200 OK`

```json
{
  "flags": [
    {
      "id": "flag_abc123",
      "key": "new-checkout-flow",
      "name": "Novo Fluxo de Checkout",
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

Busca uma flag pelo seu key.

**Escopo:** `mgmt`

::: code-group

```bash [curl]
curl https://api.flagbridge.io/v1/projects/meu-app/flags/new-checkout-flow \
  -H "Authorization: Bearer fb_sk_mgmt_SUA_KEY"
```

```typescript [SDK Node.js]
const flag = await adminClient.flags.get('meu-app', 'new-checkout-flow');
```

:::

### Resposta `200 OK`

Retorna o [objeto flag](#objeto-flag) completo, incluindo as regras de targeting.

---

## PATCH /v1/projects/{slug}/flags/{key}

Atualiza os metadados ou as regras de targeting de uma flag.

**Escopo:** `mgmt`

::: code-group

```bash [curl]
curl -X PATCH https://api.flagbridge.io/v1/projects/meu-app/flags/new-checkout-flow \
  -H "Authorization: Bearer fb_sk_mgmt_SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Checkout Redesenhado",
    "description": "Fase 2 do redesign do checkout"
  }'
```

```typescript [SDK Node.js]
const atualizado = await adminClient.flags.update('meu-app', 'new-checkout-flow', {
  name: 'Checkout Redesenhado',
});
```

:::

### Campos atualizáveis

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | string | Nome de exibição |
| `description` | string | Descrição |
| `rules` | array | Regras de targeting (substitui todo o array de regras) |
| `variants` | array | Definições de variantes |

::: warning
Enviar `rules` em uma requisição PATCH substitui todas as regras de targeting existentes. Para adicionar uma regra, primeiro faça GET das regras atuais, adicione a nova regra e envie o array completo no PATCH.
:::

### Resposta `200 OK`

Retorna o objeto flag atualizado.

---

## DELETE /v1/projects/{slug}/flags/{key}

Deleta permanentemente uma flag e todos os seus estados por environment.

**Escopo:** `mgmt`

::: code-group

```bash [curl]
curl -X DELETE https://api.flagbridge.io/v1/projects/meu-app/flags/new-checkout-flow \
  -H "Authorization: Bearer fb_sk_mgmt_SUA_KEY"
```

```typescript [SDK Node.js]
await adminClient.flags.delete('meu-app', 'new-checkout-flow');
```

:::

### Resposta `204 No Content`

Esta ação é irreversível. Todas as avaliações de flags deletadas retornam `{ "enabled": false, "reason": "FLAG_NOT_FOUND" }`.

---

## PUT /v1/projects/{slug}/flags/{key}/states/{env}

Define o estado de uma flag para um environment específico. Controla se a flag está habilitada e qual percentual de rollout se aplica.

**Escopo:** `mgmt`

::: code-group

```bash [Habilitar em produção]
curl -X PUT https://api.flagbridge.io/v1/projects/meu-app/flags/new-checkout-flow/states/production \
  -H "Authorization: Bearer fb_sk_mgmt_SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rolloutPercentage": 25
  }'
```

```bash [Rollout completo]
curl -X PUT https://api.flagbridge.io/v1/projects/meu-app/flags/new-checkout-flow/states/production \
  -H "Authorization: Bearer fb_sk_mgmt_SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rolloutPercentage": 100
  }'
```

```typescript [SDK Node.js]
await adminClient.flags.setState('meu-app', 'new-checkout-flow', 'production', {
  enabled: true,
  rolloutPercentage: 25,
});
```

:::

### Corpo da requisição

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `enabled` | boolean | Sim | Se a flag está ativa neste environment |
| `rolloutPercentage` | number \| null | Não | Percentual de usuários que recebem a flag (0–100). `null` significa todos os usuários |

### Resposta `200 OK`

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

Busca o estado atual de uma flag para um environment específico.

**Escopo:** `mgmt`

::: code-group

```bash [curl]
curl https://api.flagbridge.io/v1/projects/meu-app/flags/new-checkout-flow/states/production \
  -H "Authorization: Bearer fb_sk_mgmt_SUA_KEY"
```

```typescript [SDK Node.js]
const state = await adminClient.flags.getState('meu-app', 'new-checkout-flow', 'production');
```

:::

### Resposta `200 OK`

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

## Schema das regras de targeting

As regras de targeting são avaliadas de cima para baixo. A primeira regra que corresponder determina o resultado.

```json
{
  "rules": [
    {
      "id": "rule_abc123",
      "name": "Usuários beta",
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

### Operadores

| Operador | Tipos suportados | Exemplo |
|---|---|---|
| `equals` | string, number, boolean | `"plan" equals "pro"` |
| `not_equals` | string, number | `"country" not_equals "US"` |
| `in` | array | `"userId" in ["alice", "bob"]` |
| `not_in` | array | `"plan" not_in ["free"]` |
| `contains` | string | `"email" contains "@empresa.com"` |
| `starts_with` | string | `"email" starts_with "admin"` |
| `greater_than` | number | `"age" greater_than 18` |
| `less_than` | number | `"score" less_than 50` |
| `is_true` | boolean | `"beta" is_true` |
| `is_false` | boolean | `"verified" is_false` |
