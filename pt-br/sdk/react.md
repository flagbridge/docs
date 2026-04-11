---
title: SDK React
description: SDK oficial do FlagBridge para React — feature flags com atualizações em tempo real via SSE, hooks e suporte a TypeScript.
---

# SDK React

O pacote `@flagbridge/sdk-react` fornece avaliação de feature flags para aplicações React, com atualizações em tempo real via SSE e uma API baseada em hooks.

## Instalação

::: code-group

```bash [npm]
npm install @flagbridge/sdk-react
```

```bash [pnpm]
pnpm add @flagbridge/sdk-react
```

```bash [yarn]
yarn add @flagbridge/sdk-react
```

:::

**Requisitos:** React 18+ · Node.js 18+ (para SSR) · TypeScript 5+ (opcional)

## Início rápido

Envolva sua aplicação com `FlagBridgeProvider` e leia flags de qualquer componente usando `useFlag`.

```tsx
// app/layout.tsx (ou seu componente raiz)
import { FlagBridgeProvider } from '@flagbridge/sdk-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <FlagBridgeProvider
          apiKey={process.env.NEXT_PUBLIC_FLAGBRIDGE_API_KEY!}
          apiUrl="https://api.flagbridge.io"
          project="my-app"
          environment="production"
        >
          {children}
        </FlagBridgeProvider>
      </body>
    </html>
  );
}
```

```tsx
// components/WelcomeBanner.tsx
import { useFlag } from '@flagbridge/sdk-react';

export function WelcomeBanner() {
  const showBanner = useFlag<boolean>('new-feature', false);

  if (!showBanner) return null;

  return <div className="banner">Bem-vindo à nova experiência!</div>;
}
```

## Next.js App Router

O SDK inclui diretivas `"use client"` no provider e nos hooks. No App Router, monte o `FlagBridgeProvider` dentro de um limite client e mantenha os server components sem alterações.

```tsx
// components/FlagBridgeClientProvider.tsx
'use client';

import { FlagBridgeProvider } from '@flagbridge/sdk-react';

export function FlagBridgeClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <FlagBridgeProvider
      apiKey={process.env.NEXT_PUBLIC_FLAGBRIDGE_API_KEY!}
      apiUrl="https://api.flagbridge.io"
      project="my-app"
      environment="production"
    >
      {children}
    </FlagBridgeProvider>
  );
}
```

```tsx
// app/layout.tsx — server component
import { FlagBridgeClientProvider } from '@/components/FlagBridgeClientProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <FlagBridgeClientProvider>{children}</FlagBridgeClientProvider>
      </body>
    </html>
  );
}
```

::: info
Para avaliação de flags no servidor em React Server Components, use [`@flagbridge/sdk-node`](/pt-br/sdk/node) diretamente — sem overhead client-side.
:::

## Provider

O `FlagBridgeProvider` busca todas as flags do projeto e environment configurados na montagem e as mantém atualizadas via SSE.

### Props

| Prop | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `apiKey` | `string` | Sim | API key com escopo `eval` |
| `apiUrl` | `string` | Sim | URL base da API do FlagBridge |
| `project` | `string` | Sim | Slug do projeto |
| `environment` | `string` | Sim | Slug do environment |
| `context` | `EvalContext` | Não | Contexto de avaliação padrão para todas as flags |
| `onError` | `(error: Error) => void` | Não | Chamado sempre que ocorre um erro de fetch ou SSE |
| `children` | `React.ReactNode` | Sim | Árvore de componentes |

### `EvalContext`

```typescript
interface EvalContext {
  userId?: string;
  attributes?: Record<string, unknown>;
}
```

Passe `context` para direcionar flags ao usuário atual:

```tsx
<FlagBridgeProvider
  apiKey={process.env.NEXT_PUBLIC_FLAGBRIDGE_API_KEY!}
  apiUrl="https://api.flagbridge.io"
  project="my-app"
  environment="production"
  context={{ userId: currentUser.id, attributes: { plan: currentUser.plan } }}
>
  {children}
</FlagBridgeProvider>
```

## Hooks

### `useFlag(flagKey, defaultValue?)`

Retorna o valor atual de uma flag, ou `defaultValue` enquanto as flags estão carregando ou quando a chave não existe. O padrão é `false` se `defaultValue` for omitido.

```tsx
import { useFlag } from '@flagbridge/sdk-react';

function NovaPagina() {
  const habilitado = useFlag<boolean>('new-feature', false);
  const mensagemBoas = useFlag<string>('welcome-message', 'Olá!');
  const maxItens = useFlag<number>('max-items', 10);

  return (
    <div>
      <p>{mensagemBoas}</p>
      {habilitado && <NovoComponente maxItens={maxItens} />}
    </div>
  );
}
```

O parâmetro genérico `T` restringe o tipo de retorno. Quando omitido, o tipo de retorno é `unknown`.

### `useFlagBridge()`

Retorna o valor completo do contexto: o mapa de flags, estado de carregamento, erro e uma função `refresh`. Use quando precisar de acesso direto ao estado subjacente.

```typescript
interface FlagBridgeContextValue {
  flags: Record<string, unknown>;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}
```

```tsx
import { useFlagBridge } from '@flagbridge/sdk-react';

function StatusDasFlags() {
  const { flags, isLoading, error, refresh } = useFlagBridge();

  if (isLoading) return <Spinner />;
  if (error) return <MensagemDeErro error={error} onRetry={refresh} />;

  return (
    <ul>
      {Object.entries(flags).map(([key, value]) => (
        <li key={key}>{key}: {String(value)}</li>
      ))}
    </ul>
  );
}
```

::: warning
`useFlagBridge()` lança um erro se chamado fora de um `<FlagBridgeProvider>`. Prefira `useFlag` na maioria dos componentes e reserve `useFlagBridge` para UIs de diagnóstico ou admin.
:::

## Atualizações em tempo real (SSE)

O `FlagBridgeProvider` conecta ao stream SSE do FlagBridge na montagem e re-busca automaticamente qualquer flag alterada no servidor. As atualizações propagam para todos os componentes sem recarregar a página.

A conexão usa backoff exponencial (começando em 1 s, com limite de 30 s) e reconecta automaticamente após interrupções de rede.

```tsx
// Nenhuma configuração necessária — SSE está sempre ativo.
// Quando uma flag muda no dashboard do FlagBridge, os componentes re-renderizam automaticamente.
<FlagBridgeProvider
  apiKey="fb_sk_eval_..."
  apiUrl="https://api.flagbridge.io"
  project="my-app"
  environment="production"
>
  {children}
</FlagBridgeProvider>
```

A conexão SSE tem escopo por environment. Uma alteração em uma flag em `staging` não aciona atualizações em clientes conectados ao `production`.

## Tratamento de erros

Passe um callback `onError` para observar erros sem interromper a renderização. Os erros são expostos tanto via callback quanto pelo campo `error` em `useFlagBridge()`.

```tsx
<FlagBridgeProvider
  apiKey="fb_sk_eval_..."
  apiUrl="https://api.flagbridge.io"
  project="my-app"
  environment="production"
  onError={(error) => {
    // Enviar para seu sistema de rastreamento de erros
    Sentry.captureException(error, { tags: { source: 'flagbridge' } });
  }}
>
  {children}
</FlagBridgeProvider>
```

Quando o fetch inicial falha, `isLoading` passa para `false` e `error` é definido. Todas as chamadas a `useFlag` retornam seu `defaultValue`, então a UI degrada graciosamente sem tratamento de erro adicional nos componentes individuais.

```tsx
function AppShell() {
  const { error, refresh } = useFlagBridge();

  return (
    <>
      {error && (
        <Banner variant="warning">
          Feature flags indisponíveis.{' '}
          <button onClick={refresh}>Tentar novamente</button>
        </Banner>
      )}
      <main>{/* restante da aplicação */}</main>
    </>
  );
}
```

## TypeScript

Todos os exports são totalmente tipados. Declare um tipo union para as chaves das suas flags e obtenha autocomplete e detecção de typos em tempo de compilação.

```typescript
import {
  FlagBridgeProvider,
  useFlag,
  type FlagBridgeConfig,
  type EvalContext,
} from '@flagbridge/sdk-react';

// Declarar as chaves de flag do seu projeto
type FlagKey =
  | 'new-feature'
  | 'welcome-message'
  | 'max-items';

// Wrapper tipado em torno de useFlag
function useAppFlag<T = unknown>(key: FlagKey, defaultValue?: T): T {
  return useFlag<T>(key, defaultValue);
}

// Uso — typos viram erros de compilação
const habilitado = useAppFlag<boolean>('new-feature', false);   // ✓
const itens      = useAppFlag<number>('max-items', 10);         // ✓
const quebrado   = useAppFlag<boolean>('typo-flag', false);     // ✗ Erro TypeScript
```

## Changelog

Veja os [releases do SDK React](https://github.com/flagbridge/sdk-react/releases) no GitHub.
