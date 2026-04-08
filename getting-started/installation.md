---
title: Installation
description: Deploy FlagBridge with Docker Compose, a Go binary, or Kubernetes. Includes full environment variable reference.
---

# Installation

FlagBridge ships as a single Go binary with no runtime dependencies other than PostgreSQL. You can run it with Docker Compose, install the binary directly, or deploy to Kubernetes.

## Docker Compose (recommended)

The fastest path to a running instance. Includes PostgreSQL with a health check and a named volume for persistence.

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: flagbridge
      POSTGRES_USER: flagbridge
      POSTGRES_PASSWORD: flagbridge
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U flagbridge"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    image: ghcr.io/flagbridge/flagbridge:latest
    environment:
      DATABASE_URL: postgres://flagbridge:flagbridge@postgres:5432/flagbridge?sslmode=disable
      JWT_SECRET: your-secret-key-change-in-production
      PORT: "8080"
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
docker compose up -d

# Verify the API is up
curl http://localhost:8080/health
# {"status":"ok"}
```

::: warning
Set `JWT_SECRET` to a cryptographically random string of at least 32 characters before any deployment that faces a network.
:::

## Manual (Go binary + PostgreSQL)

Use this approach when you want to run FlagBridge directly on a server without Docker.

**Step 1 — Provision PostgreSQL**

Any PostgreSQL 14+ instance works. Create a database and user:

```sql
CREATE USER flagbridge WITH PASSWORD 'your-password';
CREATE DATABASE flagbridge OWNER flagbridge;
```

**Step 2 — Download the binary**

```bash
# Linux (amd64)
curl -Lo flagbridge \
  https://github.com/flagbridge/flagbridge/releases/latest/download/flagbridge_linux_amd64
chmod +x flagbridge

# macOS (arm64)
curl -Lo flagbridge \
  https://github.com/flagbridge/flagbridge/releases/latest/download/flagbridge_darwin_arm64
chmod +x flagbridge
```

**Step 3 — Run migrations**

```bash
DATABASE_URL="postgres://flagbridge:your-password@localhost:5432/flagbridge?sslmode=disable" \
  ./flagbridge migrate
```

**Step 4 — Start the server**

```bash
export DATABASE_URL="postgres://flagbridge:your-password@localhost:5432/flagbridge?sslmode=disable"
export JWT_SECRET="your-secret-key-change-in-production"
export PORT="8080"

./flagbridge serve
```

::: tip
For production use, manage the process with systemd or a similar init system. See the [self-hosted guide](/guides/self-hosted) for a complete systemd unit file.
:::

## Environment variables reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. Include `?sslmode=disable` for local instances or `?sslmode=require` for hosted databases. |
| `JWT_SECRET` | Yes | — | Secret used to sign and verify JWTs. Use a cryptographically random string, 32+ characters. |
| `PORT` | No | `8080` | HTTP port the API listens on. |
| `ALLOWED_ORIGINS` | No | `*` | Comma-separated list of allowed CORS origins. Set explicitly in production, e.g. `https://app.example.com`. |
| `LOG_LEVEL` | No | `info` | Log verbosity: `debug`, `info`, `warn`, `error`. |
| `LOG_FORMAT` | No | `json` | Log output format: `json` or `text`. |
| `REDIS_URL` | No | — | Redis connection URL for distributed evaluation cache. Recommended for multi-instance deployments. |
| `MAX_DB_CONNECTIONS` | No | `25` | Maximum PostgreSQL connection pool size. |

::: tip
All environment variables can also be supplied via a `.env` file when using Docker Compose.
:::

## Kubernetes (Helm)

Install with the official Helm chart:

```bash
helm repo add flagbridge https://charts.flagbridge.io
helm repo update

helm install flagbridge flagbridge/flagbridge \
  --namespace flagbridge \
  --create-namespace \
  --set config.jwtSecret="change-me-in-production" \
  --set config.databaseUrl="postgres://flagbridge:secret@your-db:5432/flagbridge?sslmode=require"
```

For a production-ready setup, use a values file:

```yaml
# flagbridge-values.yaml
replicaCount: 2

config:
  jwtSecret: "change-me-in-production"
  databaseUrl: "postgres://flagbridge:secret@your-db:5432/flagbridge?sslmode=require"
  allowedOrigins: "https://app.example.com"

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: flags.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: flags-tls
      hosts:
        - flags.example.com
```

```bash
helm install flagbridge flagbridge/flagbridge \
  --namespace flagbridge \
  --create-namespace \
  -f flagbridge-values.yaml
```

See the [Helm chart reference](https://github.com/flagbridge/helm-charts) for all available values.

## FlagBridge Cloud (SaaS)

FlagBridge Cloud is the fully managed option — no infrastructure to maintain.

1. Sign up at [app.flagbridge.io](https://app.flagbridge.io)
2. Create a project
3. Copy your API key from the project settings
4. Point your SDK to `https://api.flagbridge.io`

::: info
FlagBridge Cloud runs the same open-source core. Your data stays in your selected region.
:::

## Upgrading

::: code-group

```bash [Docker Compose]
docker compose pull
docker compose up -d

# Run any new migrations
docker compose exec api flagbridge migrate
```

```bash [Binary]
# Download the new binary (same steps as install)
# Then run migrations before restarting the server
./flagbridge migrate
```

```bash [Helm]
helm repo update
helm upgrade flagbridge flagbridge/flagbridge -f flagbridge-values.yaml
```

:::

::: warning
Always run `flagbridge migrate` after upgrading. Migrations are backward-compatible — running them before restarting is safe.
:::
