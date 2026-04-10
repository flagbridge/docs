---
title: Guia Self-Hosted
description: Checklist de deployment para produção do FlagBridge self-hosted.
---

# Guia Self-Hosted

Checklist para deploy do FlagBridge na sua infraestrutura.

## Pré-requisitos

- PostgreSQL 15+ (recomendado: serviço gerenciado como AWS RDS, Supabase ou Neon)
- Docker ou Go 1.22+ runtime
- Reverse proxy (nginx, Caddy ou load balancer cloud) para TLS

## Variáveis de Ambiente

| Variável | Obrigatório | Padrão | Descrição |
|---|---|---|---|
| `DATABASE_URL` | Sim | — | String de conexão PostgreSQL |
| `JWT_SECRET` | Sim | — | Secret para assinatura JWT (mín 32 chars) |
| `API_KEY_SALT` | Não | — | Salt para hashing de API keys |
| `PORT` | Não | `8080` | Porta do servidor API |
| `ALLOWED_ORIGINS` | Não | `localhost:3000` | Origens CORS permitidas (separadas por vírgula) |
| `SENTRY_DSN` | Não | — | DSN do Sentry para error tracking |

::: danger
Gere o `JWT_SECRET` com um valor aleatório criptograficamente seguro:
```bash
openssl rand -hex 32
```
Nunca reutilize secrets entre ambientes.
:::

## Opções de Deployment

### Docker Compose (Recomendado para times pequenos)

Use o [docker-compose.yml](https://github.com/flagbridge/flagbridge/blob/main/docker-compose.yml) do repositório:

```bash
cp .env.example .env
# Edite .env com seus valores de produção
docker compose up -d
```

### Binário Go

Baixe a última release e execute diretamente:

```bash
# Download
curl -fsSL https://github.com/flagbridge/flagbridge/releases/latest/download/flagbridge-linux-amd64 -o flagbridge
chmod +x flagbridge

# Execute as migrations primeiro
psql $DATABASE_URL -f migrations/001_initial.sql
psql $DATABASE_URL -f migrations/002_testing_sessions.sql
psql $DATABASE_URL -f migrations/003_webhooks.sql

# Inicie
DATABASE_URL=postgres://... JWT_SECRET=... ./flagbridge
```

### Kubernetes (Helm)

```bash
helm repo add flagbridge https://flagbridge.github.io/helm-charts
helm install flagbridge flagbridge/flagbridge \
  --set env.DATABASE_URL="postgres://..." \
  --set env.JWT_SECRET="..." \
  --set ingress.enabled=true \
  --set ingress.host=flags.seudominio.com
```

Veja [flagbridge/helm-charts](https://github.com/flagbridge/helm-charts) para referência completa de values.

## Checklist de Produção

- [ ] **Secrets**: `JWT_SECRET` e `API_KEY_SALT` únicos, aleatórios e armazenados com segurança
- [ ] **Banco de dados**: PostgreSQL com backups automáticos habilitados
- [ ] **TLS**: API servida via HTTPS com reverse proxy
- [ ] **CORS**: `ALLOWED_ORIGINS` configurado apenas para o domínio do Admin dashboard
- [ ] **Senha admin**: Senha padrão do admin alterada após primeiro login
- [ ] **Monitoramento**: Health check em `GET /v1/health` monitorado
- [ ] **Backups**: Schedule de backup do PostgreSQL configurado

## Atualizando

Baixe a última imagem e reinicie:

```bash
docker compose pull
docker compose up -d
```

Novas migrations são aplicadas automaticamente na inicialização via init container.

## Próximos passos

- [Referência de instalação](/pt-br/getting-started/installation) — variáveis de ambiente e opções de deployment
- [Webhooks](/pt-br/guides/webhooks) — configure notificações de alteração de flags
- [Referência da API](/pt-br/api-reference/authentication) — autenticação e documentação de endpoints
