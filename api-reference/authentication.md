---
title: Authentication
description: API key format, scopes, JWT authentication, and security best practices for the FlagBridge API.
---

# Authentication

All FlagBridge API requests require authentication. SDK routes use API keys; admin routes use JWT tokens obtained via the login endpoint.

## API key format

Every API key follows this pattern:

```
fb_sk_{scope}_{hash}
```

| Segment | Example | Description |
|---|---|---|
| `fb_sk` | — | Fixed prefix for all FlagBridge secret keys |
| `{scope}` | `eval`, `test`, `mgmt`, `full` | Determines which endpoints the key can access |
| `{hash}` | `a1b2c3d4...` | Random, cryptographically secure identifier |

**Examples:**

```
fb_sk_eval_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
fb_sk_test_q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
fb_sk_mgmt_g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8
fb_sk_full_w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4
```

## Key scopes

| Scope | Key prefix | Allowed endpoints |
|---|---|---|
| `eval` | `fb_sk_eval_` | `POST /v1/evaluate`, `POST /v1/evaluate/batch` — production SDK traffic only |
| `test` | `fb_sk_test_` | All `eval` endpoints + all Testing API endpoints — CI/E2E pipelines |
| `mgmt` | `fb_sk_mgmt_` | All flag CRUD, project management, and webhook endpoints — CI/CD automation |
| `full` | `fb_sk_full_` | All endpoints — intended for local development only |

::: warning
Never use `fb_sk_full_` or `fb_sk_mgmt_` keys in client-side code or commit them to source control. Use `fb_sk_eval_` in production server SDKs and `fb_sk_test_` in your test pipeline.
:::

## Making authenticated requests

Pass the key in the `Authorization` header as a Bearer token:

```bash
curl https://api.flagbridge.io/v1/evaluate \
  -H "Authorization: Bearer fb_sk_eval_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"flagKey": "new-checkout", "context": {"userId": "user-123"}}'
```

All API requests must use HTTPS. HTTP connections are rejected.

## JWT authentication for admin routes

Admin UI routes and some management endpoints use short-lived JWT tokens instead of API keys. Obtain a JWT by logging in:

### POST /v1/auth/login

```
POST /v1/auth/login
Content-Type: application/json
```

**Request body:**

```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-04-08T01:00:00.000Z",
  "user": {
    "id": "usr_abc123",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

Use the returned `token` as a Bearer token for admin API routes:

```bash
curl https://api.flagbridge.io/v1/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

JWT tokens expire after 1 hour. Re-authenticate to get a new token.

::: info
Use API keys for programmatic access (SDKs, CI, automation). Use JWT tokens for the admin dashboard and short-lived user sessions.
:::

## Managing API keys

::: code-group

```bash [List keys]
curl https://api.flagbridge.io/v1/projects/my-app/api-keys \
  -H "Authorization: Bearer fb_sk_mgmt_YOUR_KEY"
```

```bash [Create a key]
curl -X POST https://api.flagbridge.io/v1/projects/my-app/api-keys \
  -H "Authorization: Bearer fb_sk_mgmt_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production server",
    "scope": "eval",
    "environment": "production"
  }'
```

```bash [Rotate a key]
curl -X POST https://api.flagbridge.io/v1/api-keys/key_abc123/rotate \
  -H "Authorization: Bearer fb_sk_mgmt_YOUR_KEY"
```

```bash [Revoke a key]
curl -X DELETE https://api.flagbridge.io/v1/api-keys/key_abc123 \
  -H "Authorization: Bearer fb_sk_mgmt_YOUR_KEY"
```

:::

## Error responses

**401 Unauthorized** — key is missing, malformed, or revoked:

```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired API key"
}
```

**403 Forbidden** — key is valid but lacks scope for the endpoint:

```json
{
  "error": "FORBIDDEN",
  "message": "This key scope does not have access to this endpoint"
}
```

## Rate limits

| Scope | Rate limit |
|---|---|
| `eval` | 10,000 req/min |
| `test` | 1,000 req/min |
| `mgmt` | 500 req/min |
| `full` | 500 req/min |

All responses include rate limit headers:

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9987
X-RateLimit-Reset: 1744073600
```

The API returns `429 Too Many Requests` when the limit is exceeded. Back off and retry using the `X-RateLimit-Reset` timestamp.
