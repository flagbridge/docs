---
title: Instalação
description: Faça o deploy do FlagBridge com Docker Compose, binário Go ou Kubernetes. Inclui referência completa de variáveis de ambiente.
---

# Instalação

O FlagBridge é distribuído como um único binário Go sem dependências de runtime além do PostgreSQL. Você pode rodá-lo com Docker Compose, instalar o binário diretamente ou fazer deploy no Kubernetes.

## Docker Compose (recomendado)

O caminho mais rápido para uma instância em funcionamento. Inclui PostgreSQL com health check e um volume nomeado para persistência.

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

# Verificar se a API está funcionando
curl http://localhost:8080/health
# {"status":"ok"}
```

::: warning
Defina o `JWT_SECRET` como uma string aleatória criptograficamente segura de pelo menos 32 caracteres antes de qualquer deployment que enfrente uma rede.
:::

## Manual (binário Go + PostgreSQL)

Use esta abordagem quando quiser rodar o FlagBridge diretamente em um servidor sem Docker.

**Passo 1 — Provisionar o PostgreSQL**

Qualquer instância PostgreSQL 14+ funciona. Crie o banco e o usuário:

```sql
CREATE USER flagbridge WITH PASSWORD 'sua-senha';
CREATE DATABASE flagbridge OWNER flagbridge;
```

**Passo 2 — Baixar o binário**

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

**Passo 3 — Executar as migrações**

```bash
DATABASE_URL="postgres://flagbridge:sua-senha@localhost:5432/flagbridge?sslmode=disable" \
  ./flagbridge migrate
```

**Passo 4 — Iniciar o servidor**

```bash
export DATABASE_URL="postgres://flagbridge:sua-senha@localhost:5432/flagbridge?sslmode=disable"
export JWT_SECRET="sua-chave-secreta-mude-em-producao"
export PORT="8080"

./flagbridge serve
```

::: tip
Para uso em produção, gerencie o processo com systemd ou um sistema de init similar. Consulte o [guia self-hosted](/pt-br/guides/self-hosted) para um arquivo de unit systemd completo.
:::

## Referência de variáveis de ambiente

| Variável | Obrigatório | Padrão | Descrição |
|---|---|---|---|
| `DATABASE_URL` | Sim | — | String de conexão PostgreSQL. Use `?sslmode=disable` para instâncias locais ou `?sslmode=require` para bancos hospedados. |
| `JWT_SECRET` | Sim | — | Segredo usado para assinar e verificar JWTs. Use uma string aleatória criptograficamente segura, 32+ caracteres. |
| `PORT` | Não | `8080` | Porta HTTP em que a API escuta. |
| `ALLOWED_ORIGINS` | Não | `*` | Lista de origens CORS permitidas, separadas por vírgula. Defina explicitamente em produção, ex.: `https://app.exemplo.com`. |
| `LOG_LEVEL` | Não | `info` | Verbosidade do log: `debug`, `info`, `warn`, `error`. |
| `LOG_FORMAT` | Não | `json` | Formato de saída do log: `json` ou `text`. |
| `REDIS_URL` | Não | — | URL de conexão do Redis para cache de avaliação distribuído. Recomendado para deployments com múltiplas instâncias. |
| `MAX_DB_CONNECTIONS` | Não | `25` | Tamanho máximo do pool de conexões PostgreSQL. |

::: tip
Todas as variáveis de ambiente também podem ser fornecidas via arquivo `.env` ao usar Docker Compose.
:::

## Kubernetes (Helm)

Instale com o Helm chart oficial:

```bash
helm repo add flagbridge https://charts.flagbridge.io
helm repo update

helm install flagbridge flagbridge/flagbridge \
  --namespace flagbridge \
  --create-namespace \
  --set config.jwtSecret="mude-em-producao" \
  --set config.databaseUrl="postgres://flagbridge:secret@seu-db:5432/flagbridge?sslmode=require"
```

Para um setup pronto para produção, use um arquivo de valores:

```yaml
# flagbridge-values.yaml
replicaCount: 2

config:
  jwtSecret: "mude-em-producao"
  databaseUrl: "postgres://flagbridge:secret@seu-db:5432/flagbridge?sslmode=require"
  allowedOrigins: "https://app.exemplo.com"

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: flags.exemplo.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: flags-tls
      hosts:
        - flags.exemplo.com
```

```bash
helm install flagbridge flagbridge/flagbridge \
  --namespace flagbridge \
  --create-namespace \
  -f flagbridge-values.yaml
```

Consulte a [referência do Helm chart](https://github.com/flagbridge/helm-charts) para todos os valores disponíveis.

## FlagBridge Cloud (SaaS)

O FlagBridge Cloud é a opção totalmente gerenciada — sem infraestrutura para manter.

1. Crie uma conta em [app.flagbridge.io](https://app.flagbridge.io)
2. Crie um projeto
3. Copie sua API key nas configurações do projeto
4. Aponte seu SDK para `https://api.flagbridge.io`

::: info
O FlagBridge Cloud roda o mesmo core open-source. Seus dados ficam na região que você selecionar.
:::

## Atualização

::: code-group

```bash [Docker Compose]
docker compose pull
docker compose up -d

# Executar novas migrações
docker compose exec api flagbridge migrate
```

```bash [Binário]
# Baixe o novo binário (mesmos passos da instalação)
# Execute as migrações antes de reiniciar o servidor
./flagbridge migrate
```

```bash [Helm]
helm repo update
helm upgrade flagbridge flagbridge/flagbridge -f flagbridge-values.yaml
```

:::

::: warning
Sempre execute `flagbridge migrate` após atualizar. As migrações são retrocompatíveis — executá-las antes de reiniciar o servidor é seguro.
:::
