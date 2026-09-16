# Coding Conventions

**Analysis Date:** 2026-09-16

## Naming Patterns

**Files:**
- Components: `PascalCase.tsx` (e.g., `src/components/ui/Button.tsx`)
- Hooks: `camelCase.ts` (e.g., `src/hooks/useInterview.ts`)
- Services: `camelCase.ts` (e.g., `src/services/core/syncService.ts`)
- Tests: `name.test.ts` or `name.test.tsx` co-located with implementation.
- Integration Tests: `name.integration.test.tsx`.
- Utilities: `camelCase.ts`.

**Functions:**
- Event handlers: `handle[Event]` (e.g., `handleSendMessage`).
- Hooks: `use[HookName]`.
- Logic: `camelCase`.

**Variables:**
- Local state: `camelCase`.
- Constants: `UPPER_CASE` for global/shared constants.
- Booleans: often prefixed with `is`, `has`, `should` (e.g., `isLoading`, `hasError`).

**Types:**
- Interfaces/Types: `PascalCase`.
- Props: `[ComponentName]Props` (e.g., `interface ButtonProps`).
- Enums: `PascalCase` with `UPPER_CASE` members.

## Code Style

**Formatting:**
- **Tool:** Prettier.
- **Key settings:** `semi: true`, `tabWidth: 2`, `printWidth: 100`, `singleQuote: true`, `trailingComma: "es5"`.

**Linting:**
- **Tool:** ESLint with TypeScript and React plugins.
- **Key rules:**
  - `@typescript-eslint/no-explicit-any`: `error` (Phase 3 quality gate).
  - `no-console`: `error` (except for `warn`, `error`, `debug`, `info`).
  - `react/prop-types`: `off` (use TypeScript interfaces instead).
  - `@typescript-eslint/no-unused-vars`: `warn` (prefixed with `_` to ignore).

## Import Organization

**Order:**
1. React and standard libraries.
2. Third-party libraries (e.g., `react-router-dom`, `zustand`, `lucide-react`).
3. Internal Core/Shared (@/ alias) (`@/lib`, `@/components/ui`, `@/types`, `@/services`).
4. Feature Components (`@/features/...`).
5. Relative imports (siblings).

**Path Aliases:**
- `@/*` maps to `src/*` (configured in `tsconfig.json`).

## Error Handling

**Patterns:**
- Use `try/catch` for async operations.
- **Logging:** Use `logger` from `@/lib/logger` instead of `console`.
- **UI Feedback:** Use `notificationService` (from `@/services/core/notificationService`) for user-facing errors.
- **Validation:** Use `zod` for schema validation and shared validators from `@/lib/validation`.

## Logging

**Framework:** Custom logger in `src/lib/logger.ts`.

**Patterns:**
- Use `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()`.
- Logs are silenced in tests by default.
- `logger.debug` is hidden in production.

## Comments

**When to Comment:**
- Complex business logic or non-obvious AI prompt interactions.
- Workarounds for third-party library limitations.
- `eslint-disable` lines should have an explanatory comment or be used sparingly.

**JSDoc/TSDoc:**
- Encouraged for shared utility functions and core service methods.

## Function Design

**Size:** Prefer small, focused functions. Break down large components into sub-components and custom hooks.

**Parameters:** Prefer object destructuring for components props and functions with more than 2 parameters.

**Return Values:** Services often return result objects (e.g., `{ success: boolean, data?: T, error?: string }`).

## Module Design

**Exports:**
- Favor named exports for utilities and services.
- Components in `features/` or `components/ui/` often use default exports for pages or named exports for primitives.

**Barrel Files:**
- Used in `src/types/index.ts` to aggregate domain types.
- Used in feature sub-directories (e.g., `src/features/interview/components/index.ts` is common).

---

*Convention analysis: 2026-09-16*
