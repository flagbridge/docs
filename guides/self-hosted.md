---
title: Self-Hosted Guide
description: Production-ready deployment checklist for self-hosting FlagBridge.
---

# Self-Hosted Guide

A production-ready checklist for deploying FlagBridge on your own infrastructure.

## Prerequisites

- PostgreSQL 15+ (recommended: managed service like AWS RDS, Supabase, or Neon)
- Docker or Go 1.22+ runtime
- Reverse proxy (nginx, Caddy, or cloud load balancer) for TLS termination

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret for JWT token signing (min 32 chars) |
| `API_KEY_SALT` | No | — | Salt for API key hashing |
| `PORT` | No | `8080` | API server port |
| `ALLOWED_ORIGINS` | No | `localhost:3000` | CORS allowed origins (comma-separated) |
| `SENTRY_DSN` | No | — | Sentry error tracking DSN |

::: danger
Generate `JWT_SECRET` with a cryptographically secure random value:
```bash
openssl rand -hex 32
```
Never reuse secrets across environments.
:::

## Deployment Options

### Docker Compose (Recommended for small teams)

Use the [docker-compose.yml](https://github.com/flagbridge/flagbridge/blob/main/docker-compose.yml) from the repository. Customize the `.env` file:

```bash
cp .env.example .env
# Edit .env with your production values
docker compose up -d
```

### Go Binary

Download the latest release and run directly:

```bash
# Download
curl -fsSL https://github.com/flagbridge/flagbridge/releases/latest/download/flagbridge-linux-amd64 -o flagbridge
chmod +x flagbridge

# Run migrations first
psql $DATABASE_URL -f migrations/001_initial.sql
psql $DATABASE_URL -f migrations/002_testing_sessions.sql
psql $DATABASE_URL -f migrations/003_webhooks.sql

# Start
DATABASE_URL=postgres://... JWT_SECRET=... ./flagbridge
```

### Kubernetes (Helm)

```bash
helm repo add flagbridge https://flagbridge.github.io/helm-charts
helm install flagbridge flagbridge/flagbridge \
  --set env.DATABASE_URL="postgres://..." \
  --set env.JWT_SECRET="..." \
  --set ingress.enabled=true \
  --set ingress.host=flags.yourdomain.com
```

See [flagbridge/helm-charts](https://github.com/flagbridge/helm-charts) for full values reference.

## Production Checklist

- [ ] **Secrets**: `JWT_SECRET` and `API_KEY_SALT` are unique, random, and stored securely
- [ ] **Database**: PostgreSQL with automated backups enabled
- [ ] **TLS**: API served over HTTPS via reverse proxy
- [ ] **CORS**: `ALLOWED_ORIGINS` set to your Admin dashboard domain only
- [ ] **Admin password**: Default admin password changed after first login
- [ ] **Monitoring**: Health check at `GET /v1/health` monitored
- [ ] **Backups**: PostgreSQL backup schedule configured

## Updating

Pull the latest image and restart:

```bash
docker compose pull
docker compose up -d
```

New migrations are applied automatically on startup via the init container.

## Next steps

- [Installation reference](/getting-started/installation) — detailed environment variables and deployment options
- [Webhooks](/guides/webhooks) — set up flag change notifications
- [API Reference](/api-reference/authentication) — authentication and endpoint documentation
