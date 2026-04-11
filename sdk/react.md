---
title: React SDK
description: Official FlagBridge SDK for React — feature flags with real-time SSE updates, hooks, and TypeScript support.
---

# React SDK

The `@flagbridge/sdk-react` package provides feature flag evaluation for React applications, with built-in real-time updates via SSE and a hook-based API.

## Installation

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

**Requirements:** React 18+ · Node.js 18+ (for SSR) · TypeScript 5+ (optional)

## Quick start

Wrap your application with `FlagBridgeProvider`, then read flags from any component using `useFlag`.

```tsx
// app/layout.tsx (or your root component)
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

  return <div className="banner">Welcome to the new experience!</div>;
}
```

## Next.js App Router

The SDK ships with `"use client"` directives on both the provider and hooks. In the App Router, mount `FlagBridgeProvider` inside a client boundary and keep server components unaffected.

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
For server-side flag evaluation in React Server Components, use [`@flagbridge/sdk-node`](/sdk/node) directly — it has no client-side overhead.
:::

## Provider

`FlagBridgeProvider` fetches all flags for the configured project and environment on mount and keeps them up to date via SSE.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | Yes | API key with `eval` scope |
| `apiUrl` | `string` | Yes | Base URL for the FlagBridge API |
| `project` | `string` | Yes | Project slug |
| `environment` | `string` | Yes | Environment slug |
| `context` | `EvalContext` | No | Default evaluation context for all flags |
| `onError` | `(error: Error) => void` | No | Called whenever a fetch or SSE error occurs |
| `children` | `React.ReactNode` | Yes | Your component tree |

### `EvalContext`

```typescript
interface EvalContext {
  userId?: string;
  attributes?: Record<string, unknown>;
}
```

Pass `context` to target flags to the current user:

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

Returns the current value of a flag, or `defaultValue` while flags are loading or when the key is not found. Defaults to `false` if `defaultValue` is omitted.

```tsx
import { useFlag } from '@flagbridge/sdk-react';

function NewFeaturePage() {
  const enabled = useFlag<boolean>('new-feature', false);
  const welcomeMessage = useFlag<string>('welcome-message', 'Hello!');
  const maxItems = useFlag<number>('max-items', 10);

  return (
    <div>
      <p>{welcomeMessage}</p>
      {enabled && <NewFeatureComponent maxItems={maxItems} />}
    </div>
  );
}
```

The generic parameter `T` narrows the return type. When omitted, the return type is `unknown`.

### `useFlagBridge()`

Returns the full context value: the flags map, loading state, error, and a `refresh` function. Use this when you need direct access to the underlying state.

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

function FeatureStatus() {
  const { flags, isLoading, error, refresh } = useFlagBridge();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} onRetry={refresh} />;

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
`useFlagBridge()` throws if called outside a `<FlagBridgeProvider>`. Prefer `useFlag` in most components and reserve `useFlagBridge` for diagnostic or admin UI.
:::

## Real-time updates (SSE)

`FlagBridgeProvider` connects to the FlagBridge SSE stream on mount and automatically re-fetches any flag that changes on the server. Updates propagate to all components without a page reload.

The connection uses exponential backoff (starting at 1 s, capped at 30 s) and reconnects automatically after network interruptions.

```tsx
// No configuration needed — SSE is always active.
// When a flag changes in the FlagBridge dashboard, components re-render automatically.
<FlagBridgeProvider
  apiKey="fb_sk_eval_..."
  apiUrl="https://api.flagbridge.io"
  project="my-app"
  environment="production"
>
  {children}
</FlagBridgeProvider>
```

The SSE connection is scoped to an environment. A change to a flag in `staging` does not trigger updates in clients connected to `production`.

## Error handling

Pass an `onError` callback to observe errors without interrupting rendering. Errors are surfaced both via the callback and through the `error` field in `useFlagBridge()`.

```tsx
<FlagBridgeProvider
  apiKey="fb_sk_eval_..."
  apiUrl="https://api.flagbridge.io"
  project="my-app"
  environment="production"
  onError={(error) => {
    // Send to your error tracking
    Sentry.captureException(error, { tags: { source: 'flagbridge' } });
  }}
>
  {children}
</FlagBridgeProvider>
```

When the initial fetch fails, `isLoading` becomes `false` and `error` is set. All `useFlag` calls return their `defaultValue`, so your UI degrades gracefully without any additional error handling in individual components.

```tsx
function AppShell() {
  const { error, refresh } = useFlagBridge();

  return (
    <>
      {error && (
        <Banner variant="warning">
          Feature flags unavailable.{' '}
          <button onClick={refresh}>Retry</button>
        </Banner>
      )}
      <main>{/* rest of app */}</main>
    </>
  );
}
```

## TypeScript

All exports are fully typed. Declare a union type for your flag keys to get autocomplete and catch typos at compile time.

```typescript
import {
  FlagBridgeProvider,
  useFlag,
  type FlagBridgeConfig,
  type EvalContext,
} from '@flagbridge/sdk-react';

// Declare your project's flag keys
type FlagKey =
  | 'new-feature'
  | 'welcome-message'
  | 'max-items';

// Typed wrapper around useFlag
function useAppFlag<T = unknown>(key: FlagKey, defaultValue?: T): T {
  return useFlag<T>(key, defaultValue);
}

// Usage — typos become compile errors
const enabled = useAppFlag<boolean>('new-feature', false);   // ✓
const items   = useAppFlag<number>('max-items', 10);         // ✓
const broken  = useAppFlag<boolean>('typo-flag', false);     // ✗ TypeScript error
```

## Changelog

See the [React SDK releases](https://github.com/flagbridge/sdk-react/releases) on GitHub.
