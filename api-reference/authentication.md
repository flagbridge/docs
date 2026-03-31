---
title: Authentication
description: API key scopes, authentication headers, and security best practices.
---

# Authentication

All FlagBridge API requests require authentication via an API key passed in the `Authorization` header.

## API keys

API keys are scoped to a project and environment. There are three key types:

| Type | Prefix | Permissions |
|---|---|---|
| **Live** | `fb_live_` | Evaluate flags in production |
| **Test** | `fb_test_` | Evaluate flags + create test sessions |
| **Admin** | `fb_admin_` | Full access (CRUD, settings) |

::: warning
Never expose `fb_admin_` keys in client-side code or public repositories. Use `fb_live_` keys in server-side SDKs and `fb_test_` keys in your CI pipeline.
:::

## Making authenticated requests

```bash
curl https://api.flagbridge.io/v1/projects \
  -H "Authorization: Bearer fb_admin_YOUR_KEY_HERE"
```

All requests must use HTTPS. HTTP requests are rejected in production.

## Key scopes

### Live key (`fb_live_`)

- `POST /v1/evaluate`
- `POST /v1/evaluate/batch`

### Test key (`fb_test_`)

All live key endpoints, plus:

- `POST /v1/testing/sessions`
- `POST /v1/testing/sessions/:id/overrides`
- `DELETE /v1/testing/sessions/:id`

### Admin key (`fb_admin_`)

Full access to all endpoints.

## Managing API keys

```bash
# List API keys for a project
curl https://api.flagbridge.io/v1/projects/my-app/api-keys \
  -H "Authorization: Bearer fb_admin_YOUR_KEY"

# Create a new live key
curl -X POST https://api.flagbridge.io/v1/projects/my-app/api-keys \
  -H "Authorization: Bearer fb_admin_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production server",
    "type": "live",
    "environment": "production"
  }'

# Rotate an existing key
curl -X POST https://api.flagbridge.io/v1/api-keys/key_abc123/rotate \
  -H "Authorization: Bearer fb_admin_YOUR_KEY"

# Revoke a key
curl -X DELETE https://api.flagbridge.io/v1/api-keys/key_abc123 \
  -H "Authorization: Bearer fb_admin_YOUR_KEY"
```

## Error responses

Invalid or expired keys return `401 Unauthorized`:

```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired API key"
}
```

A valid key used for an endpoint outside its scope returns `403 Forbidden`:

```json
{
  "error": "FORBIDDEN",
  "message": "This key type does not have access to this endpoint"
}
```

## Rate limits

| Key type | Rate limit |
|---|---|
| Live | 10,000 req/min |
| Test | 1,000 req/min |
| Admin | 500 req/min |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9987
X-RateLimit-Reset: 1711929600
```

When the limit is exceeded, the API returns `429 Too Many Requests`.
