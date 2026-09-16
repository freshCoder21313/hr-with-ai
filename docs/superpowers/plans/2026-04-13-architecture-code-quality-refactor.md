# Architecture & Code Quality Refactor Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cải thiện kiến trúc và code quality của dự án HR-With-AI: thêm error boundaries, consolidate utilities, cải thiện test coverage, và unify API layer.

**Architecture:** 
- Thêm Error Boundary ở App.tsx level để handle React errors
- Consolidate trùng lặp utilities vào single exports
- Thêm unit tests cho các services có coverage thấp
- Tạo unified API client interface
- Thêm AI provider strategies mới (Anthropic, OpenRouter)

**Tech Stack:** React 18, TypeScript, Vitest, Dexie.js, Zustand

---

## Chunk 1: Error Boundaries & Global Error Handling

### Task 1.1: Create Error Boundary Component

**Files:**
- Create: `src/components/shared/ErrorBoundary.tsx`
- Modify: `src/App.tsx:27-60`

- [ ] **Step 1: Create ErrorBoundary component**

```tsx
import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-4">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground text-center">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={this.handleReset} variant="outline">
            <RefreshCw className="mr-2 w-4 h-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

- [ ] **Step 2: Add ErrorBoundary to App.tsx**

Modify `src/App.tsx`:
```tsx
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

// Wrap inside HashRouter:
<ErrorBoundary>
  <div className="min-h-[100dvh] flex flex-col ...">
    ...
  </div>
</ErrorBoundary>
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/ErrorBoundary.tsx src/App.tsx
git commit -m "feat: add ErrorBoundary component for global error handling"
```

---

### Task 1.2: Add Async Error Handler for Services

**Files:**
- Modify: `src/index.tsx`
- Create: `src/components/shared/GlobalErrorHandler.tsx`

- [ ] **Step 1: Create GlobalErrorHandler for uncaught promise errors**

```tsx
import { useEffect } from 'react';

export function GlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}
```

- [ ] **Step 2: Add to App.tsx (outside ErrorBoundary)**

```tsx
<ErrorBoundary>
  <GlobalErrorHandler />
  <div className="...">...</div>
</ErrorBoundary>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/GlobalErrorHandler.tsx src/App.tsx
git commit -m "feat: add GlobalErrorHandler for uncaught promise errors"
```

---

## Chunk 2: Consolidate Utilities

### Task 2.1: Analyze and Merge Duplicate Utilities

**Files:**
- Create: `src/lib/consolidated.ts` (exports from utils.ts, svgUtils.ts)
- Modify: `src/lib/utils.ts`
- Modify: `src/lib/svgUtils.ts`

- [ ] **Step 1: Read current utils.ts and svgUtils.ts**

Read `src/lib/utils.ts` and `src/lib/svgUtils.ts` to understand what's there.

- [ ] **Step 2: Create consolidated exports**

Modify `src/lib/utils.ts` to re-export all useful functions from svgUtils.ts:

```tsx
// Add at the end of utils.ts
// Re-export from svgUtils for convenience
export * from './svgUtils';
```

- [ ] **Step 3: Verify imports still work**

Search for imports of these utilities and run typecheck.

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils.ts
git commit -m "refactor: consolidate utility exports"
```

---

## Chunk 3: Improve Test Coverage

### Task 3.1: Add Tests for Core Services

**Files:**
- Modify: `src/services/core/syncService.test.ts`
- Create: `src/services/core/settingsService.test.ts`

- [ ] **Step 1: Read existing syncService.test.ts**

```ts
npx vitest run src/services/core/syncService.test.ts
```

- [ ] **Step 2: Add missing test cases**

Add tests for:
- `mergeInterview` function with conflict resolution
- `syncToRemote` with network error handling
- `resolveConflict` using updatedAt timestamps

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/services/core/syncService.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/services/core/syncService.test.ts
git commit -m "test: add syncService test coverage"
```

---

### Task 3.2: Add Tests for Voice Services

**Files:**
- Create: `src/services/voice/speechToTextService.test.ts`
- Create: `src/services/voice/textToSpeechService.test.ts`

- [ ] **Step 1: Read the service files**

```ts
src/services/voice/speechToTextService.ts
src/services/voice/textToSpeechService.ts
```

- [ ] **Step 2: Create unit tests with mocks**

Mock Web Speech API or provider SDKs.

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/services/voice/
```

- [ ] **Step 4: Commit**

---

## Chunk 4: Add Missing AI Providers

### Task 4.1: Add Anthropic Provider Strategy

**Files:**
- Create: `src/features/ai-provider/strategies/anthropic.ts`
- Modify: `src/features/ai-provider/ai.service.ts`

- [ ] **Step 1: Check existing strategy patterns**

Read `src/features/ai-provider/strategies/google-gemini.ts` to follow the pattern.

- [ ] **Step 2: Create Anthropic strategy**

```ts
import { AIProviderStrategy, ChatMessage, AIResponse, AIRequestOptions } from '@/types';

export class AnthropicStrategy implements AIProviderStrategy {
  constructor(
    private apiKey: string,
    private baseUrl = 'https://api.anthropic.com'
  ) {}

  async generateText(
    messages: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options?.modelId || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: messages.map(m => ({
          role: m.role === 'model' ? 'assistant' : m.role,
          content: m.content,
        })),
        temperature: options?.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      text: data.content[0]?.text || '',
      usage: data.usage,
      rawResponse: data,
    };
  }

  async *streamText(
    messages: ChatMessage[],
    options?: AIRequestOptions
  ): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options?.modelId || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: messages.map(m => ({
          role: m.role === 'model' ? 'assistant' : m.role,
          content: m.content,
        })),
        temperature: options?.temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            const delta = json.delta?.text;
            if (delta) yield delta;
          } catch {}
        }
      }
    }
  }
}
```

- [ ] **Step 3: Update ai.service.ts switch statement**

Modify `src/features/ai-provider/ai.service.ts`:

```ts
import { AnthropicStrategy } from './strategies/anthropic';

constructor(config: AIConfig) {
  switch (config.provider) {
    case 'google':
      this.strategy = new GoogleGeminiStrategy(config.apiKey, config.baseUrl);
      break;
    case 'openai':
      if (!config.baseUrl) {
        throw new Error('Base URL is required for OpenAI/Custom provider');
      }
      this.strategy = new OpenAICustomStrategy(config.apiKey, config.baseUrl, config.modelId);
      break;
    case 'anthropic':
      this.strategy = new AnthropicStrategy(config.apiKey, config.baseUrl);
      break;
    default:
      throw new Error(`Provider '${config.provider}' is not supported`);
  }
}
```

- [ ] **Step 4: Add to types/index.ts if needed**

Check that `AIModelProvider` includes 'anthropic'.

- [ ] **Step 5: Verify it compiles**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/features/ai-provider/strategies/anthropic.ts src/features/ai-provider/ai.service.ts
git commit -m "feat: add Anthropic AI provider strategy"
```

---

### Task 4.2: Add OpenRouter Provider Strategy

**Files:**
- Create: `src/features/ai-provider/strategies/openrouter.ts`
- Modify: `src/features/ai-provider/ai.service.ts`

- [ ] **Step 1: Create OpenRouter strategy**

OpenRouter uses OpenAI-compatible API but with different routing.

```ts
import { AIProviderStrategy, ChatMessage, AIResponse, AIRequestOptions } from '@/types';

export class OpenRouterStrategy implements AIProviderStrategy {
  constructor(
    private apiKey: string,
    private modelId = 'openai/gpt-4o'
  ) {}

  async generateText(
    messages: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'HR-With-AI',
      },
      body: JSON.stringify({
        model: options?.modelId || this.modelId,
        messages: messages.map(m => ({
          role: m.role === 'model' ? 'assistant' : m.role,
          content: m.content,
        })),
        temperature: options?.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0]?.message?.content || '',
      usage: data.usage,
      rawResponse: data,
    };
  }

  async *streamText(
    messages: ChatMessage[],
    options?: AIRequestOptions
  ): AsyncIterable<string> {
    // Similar to OpenAICustomStrategy with OpenRouter headers
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'HR-With-AI',
      },
      body: JSON.stringify({
        model: options?.modelId || this.modelId,
        messages: messages.map(m => ({
          role: m.role === 'model' ? 'assistant' : m.role,
          content: m.content,
        })),
        temperature: options?.temperature,
        stream: true,
      }),
    });

    // ... implement streaming similar to other strategies
  }
}
```

- [ ] **Step 2: Update ai.service.ts**

- [ ] **Step 3: Verify compiles**

- [ ] **Step 4: Commit**

---

## Chunk 5: Unified API Layer

### Task 5.1: Refactor API Client

**Files:**
- Modify: `src/lib/api-client.ts`
- Modify: `src/services/ai/aiConfigService.ts`

- [ ] **Step 1: Read current api-client.ts and understand usage patterns**

- [ ] **Step 2: Create unified API wrapper**

```ts
// src/lib/api-client.ts
export class ApiClient {
  constructor(private baseUrl: string, private headers: Record<string, string> = {}) {}

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...this.headers, ...options?.headers },
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  }

  async post<T>(endpoint: string, data: unknown, options?: RequestInit): Promise<T> {
    return this.get<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
```

- [ ] **Step 3: Use in services**

- [ ] **Step 4: Commit**

---

## Summary

After completing all chunks:

| Task | Files Changed | Impact |
|------|------------|--------|
| Error Boundaries | +2 files | Global error handling |
| Utilities | 1 modified | Cleaner exports |
| Test Coverage | +4 test files | ~35%+ overall |
| AI Providers | +2 strategies | Anthropic, OpenRouter |
| API Layer | 1 refactored | Consistent API calls |

Total: ~9 new files, ~5 modified files

---