---
title: Instalação
description: "Opções de deployment para o FlagBridge: self-hosted, SaaS e Kubernetes."
---

# Instalação

O FlagBridge pode ser implantado de três formas: self-hosted via Docker, no FlagBridge Cloud (SaaS) ou no Kubernetes com o Helm chart oficial.

## Self-hosted (Docker Compose)

A forma mais simples de fazer o deploy self-hosted usa Docker Compose com PostgreSQL.

```yaml
# docker-compose.yml
services:
  flagbridge:
    image: ghcr.io/flagbridge/flagbridge:latest
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://flagbridge:secret@db:5432/flagbridge
      SECRET_KEY: mude-em-producao
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: flagbridge
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: flagbridge
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U flagbridge"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
docker compose up -d

# Executar as migrações do banco de dados
docker compose exec flagbridge flagbridge migrate

# Verificar se está rodando
curl http://localhost:8080/health
```

::: warning
Altere a `SECRET_KEY` antes de fazer deploy em produção. Use uma string aleatória criptograficamente segura de pelo menos 32 caracteres.
:::

## Variáveis de ambiente

| Variável | Obrigatório | Padrão | Descrição |
|---|---|---|---|
| `DATABASE_URL` | Sim | — | String de conexão PostgreSQL |
| `SECRET_KEY` | Sim | — | Segredo para assinar tokens |
| `PORT` | Não | `8080` | Porta HTTP |
| `REDIS_URL` | Não | — | URL do Redis para cache distribuído |
| `LOG_LEVEL` | Não | `info` | Nível de log (`debug`, `info`, `warn`, `error`) |
| `LOG_FORMAT` | Não | `json` | Formato do log (`json`, `text`) |
| `CORS_ORIGINS` | Não | `*` | Origens CORS permitidas (separadas por vírgula) |
| `MAX_CONNECTIONS` | Não | `25` | Máximo de conexões PostgreSQL |

## Kubernetes (Helm) **CE**

Instale com o Helm chart oficial:

```bash
helm repo add flagbridge https://charts.flagbridge.io
helm repo update

# Criar arquivo de valores
cat > flagbridge-values.yaml <<EOF
image:
  tag: latest

config:
  secretKey: "mude-em-producao"

postgresql:
  enabled: true
  auth:
    password: "mude-isso"

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: flags.exemplo.com.br
      paths:
        - path: /
          pathType: Prefix
EOF

helm install flagbridge flagbridge/flagbridge \
  --namespace flagbridge \
  --create-namespace \
  -f flagbridge-values.yaml
```

### Banco de dados externo

```yaml
# flagbridge-values.yaml
postgresql:
  enabled: false

config:
  databaseUrl: "postgres://usuario:senha@seu-db:5432/flagbridge"
  secretKey: "mude-em-producao"
```

### Alta disponibilidade

```yaml
replicaCount: 3

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

redis:
  enabled: true
```

Consulte a [referência do Helm chart](https://github.com/flagbridge/helm-charts) para todos os valores disponíveis.

## FlagBridge Cloud (SaaS)

O FlagBridge Cloud é a opção totalmente gerenciada — sem infraestrutura para manter.

1. Crie uma conta em [app.flagbridge.io](https://app.flagbridge.io)
2. Crie um projeto
3. Copie sua API key
4. Aponte seu SDK para `https://api.flagbridge.io`

::: info
O FlagBridge Cloud usa o mesmo core open-source. Seus dados ficam na sua região.
:::

## Atualização

```bash
# Docker Compose
docker compose pull
docker compose up -d

# Executar novas migrações
docker compose exec flagbridge flagbridge migrate
```

```bash
# Helm
helm repo update
helm upgrade flagbridge flagbridge/flagbridge -f flagbridge-values.yaml
```
