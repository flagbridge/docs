---
title: Autenticação
description: Formato das API keys, escopos, autenticação JWT e boas práticas de segurança para a API do FlagBridge.
---

# Autenticação

Todas as requisições à API do FlagBridge exigem autenticação. Rotas de SDK usam API keys; rotas administrativas usam tokens JWT obtidos via endpoint de login.

## Formato das API keys

Toda API key segue este padrão:

```
fb_sk_{scope}_{hash}
```

| Segmento | Exemplo | Descrição |
|---|---|---|
| `fb_sk` | — | Prefixo fixo para todas as secret keys do FlagBridge |
| `{scope}` | `eval`, `test`, `mgmt`, `full` | Determina quais endpoints a key pode acessar |
| `{hash}` | `a1b2c3d4...` | Identificador aleatório criptograficamente seguro |

**Exemplos:**

```
fb_sk_eval_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
fb_sk_test_q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
fb_sk_mgmt_g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8
fb_sk_full_w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4
```

## Escopos das keys

| Escopo | Prefixo | Endpoints permitidos |
|---|---|---|
| `eval` | `fb_sk_eval_` | `POST /v1/evaluate`, `POST /v1/evaluate/batch` — tráfego de produção do SDK |
| `test` | `fb_sk_test_` | Todos os endpoints `eval` + todos os endpoints da Testing API — pipelines CI/E2E |
| `mgmt` | `fb_sk_mgmt_` | CRUD completo de flags, gestão de projetos e endpoints de webhook — automação CI/CD |
| `full` | `fb_sk_full_` | Todos os endpoints — apenas para desenvolvimento local |

::: warning
Nunca use keys `fb_sk_full_` ou `fb_sk_mgmt_` em código client-side ou as commite no controle de versão. Use `fb_sk_eval_` em SDKs de produção no servidor e `fb_sk_test_` no pipeline de testes.
:::

## Fazendo requisições autenticadas

Passe a key no header `Authorization` como Bearer token:

```bash
curl https://api.flagbridge.io/v1/evaluate \
  -H "Authorization: Bearer fb_sk_eval_SUA_KEY_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"flagKey": "novo-checkout", "context": {"userId": "user-123"}}'
```

Todas as requisições à API devem usar HTTPS. Conexões HTTP são rejeitadas.

## Autenticação JWT para rotas administrativas

A UI administrativa e alguns endpoints de gestão usam tokens JWT de curta duração em vez de API keys. Obtenha um JWT fazendo login:

### POST /v1/auth/login

```
POST /v1/auth/login
Content-Type: application/json
```

**Corpo da requisição:**

```json
{
  "email": "admin@exemplo.com",
  "password": "sua-senha"
}
```

**Resposta:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-04-08T01:00:00.000Z",
  "user": {
    "id": "usr_abc123",
    "email": "admin@exemplo.com",
    "role": "admin"
  }
}
```

Use o `token` retornado como Bearer token nas rotas administrativas:

```bash
curl https://api.flagbridge.io/v1/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Tokens JWT expiram após 1 hora. Faça login novamente para obter um novo token.

::: info
Use API keys para acesso programático (SDKs, CI, automação). Use tokens JWT para o dashboard administrativo e sessões de usuário de curta duração.
:::

## Gerenciando API keys

::: code-group

```bash [Listar keys]
curl https://api.flagbridge.io/v1/projects/meu-app/api-keys \
  -H "Authorization: Bearer fb_sk_mgmt_SUA_KEY"
```

```bash [Criar key]
curl -X POST https://api.flagbridge.io/v1/projects/meu-app/api-keys \
  -H "Authorization: Bearer fb_sk_mgmt_SUA_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Servidor de produção",
    "scope": "eval",
    "environment": "production"
  }'
```

```bash [Rotacionar key]
curl -X POST https://api.flagbridge.io/v1/api-keys/key_abc123/rotate \
  -H "Authorization: Bearer fb_sk_mgmt_SUA_KEY"
```

```bash [Revogar key]
curl -X DELETE https://api.flagbridge.io/v1/api-keys/key_abc123 \
  -H "Authorization: Bearer fb_sk_mgmt_SUA_KEY"
```

:::

## Respostas de erro

**401 Unauthorized** — key ausente, malformada ou revogada:

```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired API key"
}
```

**403 Forbidden** — key válida, mas sem escopo para o endpoint:

```json
{
  "error": "FORBIDDEN",
  "message": "This key scope does not have access to this endpoint"
}
```

## Rate limits

| Escopo | Rate limit |
|---|---|
| `eval` | 10.000 req/min |
| `test` | 1.000 req/min |
| `mgmt` | 500 req/min |
| `full` | 500 req/min |

Todas as respostas incluem headers de rate limit:

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9987
X-RateLimit-Reset: 1744073600
```

A API retorna `429 Too Many Requests` quando o limite é atingido. Aguarde e tente novamente usando o timestamp do `X-RateLimit-Reset`.
