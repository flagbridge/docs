---
title: Conceitos Fundamentais
description: Entenda projetos, environments, flags, flag states, regras de targeting, API keys, ordem de avaliação e testing sessions no FlagBridge.
---

# Conceitos Fundamentais

O FlagBridge é construído em torno de um pequeno conjunto de conceitos combináveis. Entendê-los desde o início facilita as decisões de arquitetura de flags e evita armadilhas comuns.

## Projetos

Um **projeto** é o contêiner de nível mais alto para flags, environments e API keys. Na maioria dos casos, um projeto mapeia para uma aplicação ou serviço.

```
minha-org
├── projeto: web-app
│   ├── environments: production, staging, development
│   └── flags: new-checkout-flow, dark-mode, sidebar-v2
└── projeto: mobile-app
    ├── environments: production, staging, development
    └── flags: biometric-login, new-onboarding
```

Projetos são isolados — flags, environments e API keys de um projeto não têm relação com os de outro.

## Environments

**Environments** permitem controlar flags de forma independente em cada estágio do deployment. Todo projeto é criado com três environments padrão:

| Environment | Uso típico |
|---|---|
| `production` | Tráfego real de usuários |
| `staging` | Validação pré-release |
| `development` | Desenvolvimento local |

Uma flag habilitada em `staging` não afeta `production`. Você pode testar regras de targeting, percentuais de rollout e o comportamento de novas flags em environments inferiores antes de promover para produção.

::: tip
Você pode criar environments adicionais (ex.: `preview`, `canary`) nas configurações do projeto.
:::

## Flags

Uma **flag** é um toggle de feature nomeado e tipado. O FlagBridge suporta três tipos de flag:

| Tipo | Exemplo de valor | Caso de uso |
|---|---|---|
| `boolean` | `true` / `false` | Feature ligada/desligada |
| `string` | `"v2"`, `"azul"` | Variantes A/B, valores de configuração |
| `number` | `0.15`, `42` | Percentuais de rollout, limites |

Cada flag possui:

- **Key** — o identificador único usado no seu código (ex.: `new-checkout-flow`). Imutável após a criação. Use kebab-case.
- **Name** — rótulo legível exibido na interface.
- **Type** — `boolean`, `string` ou `number`.
- **Default value** — o valor retornado quando nenhuma regra corresponde e a flag está habilitada.

As chaves de flag são identificadores estáveis — alterá-las quebraria todas as chamadas de SDK que referenciam a chave antiga.

## Flag States

O **estado de uma flag** é por environment. A mesma flag pode estar habilitada em `staging` e desabilitada em `production` simultaneamente.

Cada estado de environment contém:

- `enabled` — se a flag está ativa naquele environment
- `value` — o valor padrão quando nenhuma regra de targeting corresponde
- `rules` — a lista de regras de targeting para aquele environment

```json
{
  "key": "new-checkout-flow",
  "environments": {
    "production": {
      "enabled": false,
      "value": false,
      "rules": []
    },
    "staging": {
      "enabled": true,
      "value": true,
      "rules": [
        { "id": "rule_abc", "condition": {"attribute": "plan", "operator": "eq", "value": "beta"} }
      ]
    }
  }
}
```

Desabilitar uma flag no nível do environment faz com que a avaliação retorne imediatamente o estado desabilitado da flag para todos os usuários naquele environment, independentemente das regras de targeting.

## Regras de targeting

**Regras de targeting** permitem habilitar uma flag para um subconjunto de usuários sem habilitá-la para todos. As regras são avaliadas em ordem de prioridade — a primeira regra que corresponder determina o resultado.

Cada regra contém:

- **Conditions** — uma ou mais verificações de atributo
- **Operator** — como as condições são combinadas (`AND` / `OR`)
- **Value** — o valor da flag a ser retornado quando esta regra corresponder
- **Priority** — ordem de avaliação (número menor = avaliado primeiro)

### Operadores disponíveis

| Operador | Descrição |
|---|---|
| `eq` | Igual a |
| `neq` | Diferente de |
| `in` | Valor está em uma lista |
| `not_in` | Valor não está em uma lista |
| `contains` | String contém substring |
| `gt` / `gte` | Maior que / maior ou igual a |
| `lt` / `lte` | Menor que / menor ou igual a |
| `exists` | Atributo está presente no contexto |

### Exemplo de regra

Habilitar uma flag para usuários no plano `beta` no Brasil:

```json
{
  "conditions": [
    { "attribute": "plan", "operator": "eq", "value": "beta" },
    { "attribute": "country", "operator": "eq", "value": "BR" }
  ],
  "operator": "AND",
  "value": true,
  "priority": 1
}
```

O **contexto de avaliação** é o conjunto de atributos que sua aplicação passa ao chamar o endpoint de avaliação. Qualquer atributo pode ser usado em regras — os mais comuns são `userId`, `email`, `country`, `plan` e `orgId`.

::: info
Os atributos de contexto são usados apenas para avaliação de regras. O FlagBridge não os armazena nem os indexa, a menos que você habilite integrações de analytics.
:::

## API Keys

As API keys autenticam requisições ao FlagBridge. Cada key tem um **escopo** que limita o que ela pode fazer:

| Escopo | Descrição | Uso típico |
|---|---|---|
| `eval` | Avaliar flags apenas | Instâncias de SDK em apps de produção |
| `test` | Avaliar flags + gerenciar testing sessions | Test runners de E2E |
| `mgmt` | Acesso completo de gerenciamento (sem avaliação) | Pipelines CI/CD, scripts de admin |
| `full` | Avaliação + gerenciamento | Somente environments de desenvolvimento |

::: warning
Nunca use uma key com escopo `full` ou `mgmt` em código client-side. Use keys `eval` em browsers e apps mobile.
:::

As keys também têm escopo para um **projeto** e **environment** específicos. Uma key `eval` para `my-app/production` não pode avaliar flags em `my-app/staging`.

## Avaliação

Quando sua aplicação chama o endpoint de avaliação, o FlagBridge resolve o valor da flag usando esta ordem de precedência:

```
1. Override de testing session  → maior prioridade, sempre vence
2. Regras de targeting          → avaliadas em ordem de prioridade, primeira correspondência vence
3. Rollout por porcentagem      → aplicado se nenhuma regra de targeting correspondeu
4. Padrão do environment        → o valor padrão da flag para este environment
5. Padrão da flag               → o valor padrão global da flag
```

### Razões de avaliação

A API sempre retorna um campo `reason` explicando como o valor foi resolvido:

| Reason | Descrição |
|---|---|
| `TEST_OVERRIDE` | Override aplicado por uma testing session |
| `TARGETING_RULE_MATCH` | Uma regra de targeting correspondeu |
| `PERCENTAGE_ROLLOUT` | Incluído no rollout por porcentagem |
| `PERCENTAGE_ROLLOUT_EXCLUDED` | Excluído do rollout por porcentagem |
| `FLAG_ENABLED` | Flag está ativa sem regras — retornando valor padrão |
| `FLAG_DISABLED` | Flag está desabilitada para este environment |
| `FLAG_NOT_FOUND` | A chave da flag não existe (retorna desabilitada) |

Use o campo `reason` durante a depuração para entender exatamente por que um usuário recebeu um determinado valor.

### Rollouts por porcentagem

Os rollouts por porcentagem usam um hash consistente do `userId` para determinar a inclusão. Um rollout de 20% sempre inclui os mesmos 20% dos usuários. Aumentar a porcentagem adiciona usuários — nunca remove os que já estavam incluídos (monotônico).

## Testing Sessions

As **testing sessions** permitem que testes E2E sobrescrevam valores de flags de forma isolada, sem afetar o tráfego real. Cada session recebe um token único. Qualquer requisição de avaliação que inclua o header da session receberá os overrides definidos para aquela session.

Isso permite escrever testes determinísticos:

```bash
# 1. Criar uma testing session
curl -X POST http://localhost:8080/v1/testing-sessions \
  -H "Authorization: Bearer fb_sk_test_..." \
  -H "Content-Type: application/json" \
  -d '{
    "projectSlug": "my-app",
    "environment": "staging",
    "overrides": {
      "new-checkout-flow": true,
      "dark-mode": false
    }
  }'
# Retorna: {"token": "sess_abc123", ...}

# 2. Usar o token da session nas requisições de avaliação
curl -X POST http://localhost:8080/v1/evaluate \
  -H "Authorization: Bearer fb_sk_test_..." \
  -H "X-FlagBridge-Session: sess_abc123" \
  -H "Content-Type: application/json" \
  -d '{"flagKey": "new-checkout-flow", "context": {"userId": "test-user"}}'
# Retorna: {"enabled": true, "reason": "TEST_OVERRIDE"}

# 3. Deletar a session quando o test run terminar
curl -X DELETE http://localhost:8080/v1/testing-sessions/sess_abc123 \
  -H "Authorization: Bearer fb_sk_test_..."
```

As sessions são isoladas — overrides em uma session não têm efeito em requisições sem aquele token, nem em outras sessions.

::: tip
Consulte a [referência da Testing API](/pt-br/api-reference/testing) para o ciclo de vida completo da session, incluindo como passar o token através do seu framework de testes e do SDK.
:::
