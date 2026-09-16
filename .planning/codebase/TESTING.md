# Testing Patterns

**Analysis Date:** 2026-09-16

## Test Framework

**Runner:**
- **Vitest** (v4+)
- Environment: `jsdom`
- Config: `vite.config.ts` (often includes test config) or `vitest.config.ts`.
- Setup: `src/setupTests.ts`.

**Assertion Library:**
- Included with Vitest (Jest-compatible).
- `@testing-library/jest-dom` for DOM assertions.

**Run Commands:**
```bash
npm run test           # Run all tests in watch mode
npx vitest run         # Single run
npm run test:coverage  # Coverage report (v8 provider)
npm run test:e2e       # Playwright E2E tests
```

## Test File Organization

**Location:**
- Co-located with implementation: `src/path/to/file.ts` -> `src/path/to/file.test.ts`.

**Naming:**
- Unit tests: `*.test.ts` or `*.test.tsx`.
- Integration tests: `*.integration.test.tsx`.
- Profile-specific tests: `*.profiles.test.ts`.

**Structure:**
- Co-located within `src/features/...`, `src/services/...`, `src/lib/...`.

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myService } from './myService';

describe('myService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('myMethod', () => {
    it('should perform expected action', () => {
      const result = myService.myMethod();
      expect(result).toBe(true);
    });
  });
});
```

**Patterns:**
- **Setup:** `beforeEach` to clear mocks and reset local storage.
- **Teardown:** `afterEach` for `vi.restoreAllMocks()`.
- **Assertion:** Standard `expect` assertions.

## Mocking

**Framework:** Vitest built-in `vi` utility.

**Patterns:**
```typescript
// Mocking internal modules
vi.mock('@/lib/db', () => ({
  db: {
    interviews: { toArray: vi.fn() }
  }
}));

// Mocking external libraries
vi.mock('axios');

// Using mocked types
import { db } from '@/lib/db';
vi.mocked(db.interviews.toArray).mockResolvedValue([]);
```

**What to Mock:**
- Database (`dexie`).
- API calls (`axios`, `apiClient`).
- Timers and random values.
- AI Provider SDKs.

**What NOT to Mock:**
- Pure utility functions.
- Domain models and types.

## Fixtures and Factories

**Test Data:**
- Often defined inline or shared as constants in the test file.
- `InterviewStatus` and other domain enums from `@/types`.

**Location:**
- Usually within the test files or specific `.test.ts` helpers.

## Coverage

**Requirements:** Phase 3 quality gates imply high coverage for core logic (services/lib).

**View Coverage:**
```bash
npm run test:coverage
```

## Test Types

**Unit Tests:**
- Services logic (e.g., `syncService.test.ts`).
- Utility functions (e.g., `utils.test.ts`).
- Hooks (e.g., `useCVStudio.test.ts`).

**Integration Tests:**
- Feature workflows (e.g., `InterviewRoom.integration.test.tsx`).
- Complex service interactions.

**E2E Tests:**
- **Framework:** Playwright.
- Located in `e2e/` or similar (check `package.json`).
- Used for critical user journeys (Mock Interview, Resume Building).

## Common Patterns

**Async Testing:**
```typescript
it('handles async logic', async () => {
  const data = await myService.fetch();
  expect(data).toBeDefined();
});
```

**Error Testing:**
```typescript
it('throws on invalid input', () => {
  expect(() => myService.validate(null)).toThrow();
});
```

**Mocking Time:**
```typescript
vi.useFakeTimers();
// ... logic ...
vi.advanceTimersByTime(1000);
vi.useRealTimers();
```

---

*Testing analysis: 2026-09-16*
