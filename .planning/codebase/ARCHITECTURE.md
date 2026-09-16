<!-- refreshed: 2026-09-16 -->
# Architecture

**Analysis Date:** 2026-09-16

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      UI / Features Layer                     │
│  `src/features/*` (Interview, Resume, Dashboard)             │
├──────────────────┬──────────────────┬───────────────────────┤
│   Hooks & Stores │   React Components │    Feature Logic      │
│  `*/hooks/*`     │  `*/components/*`  │   `*/stores/*`        │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  `src/services/*` (AI, Interview, Jobs, Prompts, Resume)     │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│             Infrastructure / Core Layer                      │
│  `src/lib/*` (Dexie, Logger) | `src/types/*` (Domain)        │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `AIService` | Core AI communication, provider strategies, and fallback logic | `src/services/ai/ai.service.ts` |
| `HRDatabase` | IndexedDB persistence via Dexie, schema migrations, and data hooks | `src/lib/db.ts` |
| `PromptSystem` | Domain-specific AI prompt management | `src/services/prompts/` |
| `InterviewStore` | Global state for active interview sessions | `src/features/interview/stores/` |
| `SyncService` | Cloud synchronization and merge logic | `src/services/core/syncService.ts` |

## Pattern Overview

**Overall:** Feature-Based Layered Architecture

**Key Characteristics:**
- **Feature Isolation:** UI logic, hooks, and stores are encapsulated within `src/features/`.
- **Strict Dependency Direction:** UI depends on Services, Services depend on Lib/Types. Services never import from Features (ADR 000).
- **Service-Oriented AI:** AI logic is decoupled from UI via specialized domain services (e.g., `interviewAIService.ts`).

## Layers

**UI Features:**
- Purpose: Application screens and interactive workflows.
- Location: `src/features/`
- Contains: React components, feature-specific hooks, and Zustand stores.
- Depends on: `src/services/`, `src/lib/`, `src/types/`
- Used by: `src/App.tsx`

**Service Layer:**
- Purpose: Orchestrates business logic, domain processing, and external API calls.
- Location: `src/services/`
- Contains: AI service wrappers, job matching logic, prompt builders.
- Depends on: `src/lib/`, `src/types/`
- Used by: `src/features/`

**Infrastructure Layer:**
- Purpose: Core utilities, database configuration, and global type definitions.
- Location: `src/lib/`, `src/types/`
- Contains: Dexie DB setup, logger, shared utilities, domain interfaces.
- Depends on: External libraries (Dexie, Zustand, Zod).
- Used by: All layers.

## Data Flow

### Primary Request Path (Mock Interview)

1. **User Action:** Candidate sends a message in the UI (`src/features/interview/components/ChatPanel.tsx`).
2. **State Update:** `useInterviewStore` updates the message history.
3. **Service Call:** UI calls `streamInterviewMessage` (`src/services/interview/interviewAIService.ts`).
4. **AI Generation:** `interviewAIService` fetches prompts from `promptSystem.ts` and calls `AIService`.
5. **Streaming Response:** AI response chunks are yielded back to the UI store for real-time display.

### Data Persistence Flow

1. **Write Operation:** A service or store calls `db.resumes.add()`.
2. **Middleware (Hooks):** `src/lib/db.ts` hooks intercept the call to add `updatedAt` and compress `parsedData` using `src/lib/resumeCompression.ts`.
3. **Storage:** Data is persisted to IndexedDB.
4. **Read Operation:** Hooks decompress `compressedData` back into `parsedData` transparently for the consumer.

## Key Abstractions

**`AIProviderStrategy`:**
- Purpose: Interface for different AI providers (Gemini, OpenAI, etc.).
- Examples: `src/services/ai/strategies/`
- Pattern: Strategy Pattern managed by `FallbackAIService`.

**`InterviewContext`:**
- Purpose: Represents the full state of an interview (messages, code, status, context).
- Examples: `src/types/interview.ts`
- Pattern: Domain Object.

## Entry Points

**Web/Vite:**
- Location: `src/index.tsx`
- Triggers: Browser page load.
- Responsibilities: Mounts React tree, initializes `HashRouter` for mobile compatibility.

**Mobile (Capacitor):**
- Location: `capacitor.config.ts` (root)
- Triggers: Android/iOS app launch.
- Responsibilities: Bridges web view to native platform.

## Architectural Constraints

- **Dependency Direction:** `services/` must NOT import from `features/` (ADR 000).
- **Mobile Environment:** Must use `HashRouter` because Capacitor uses `file://` protocol.
- **State Persistence:** Large data structures (Resumes, Interviews) must be stored in IndexedDB (`src/lib/db.ts`), not just memory or localStorage.
- **AI Security:** API keys should be handled via user settings/local storage, not hardcoded in environment variables (for client-side security).

## Anti-Patterns

### Circular Feature Dependencies

**What happens:** Feature A imports from Feature B, and Feature B imports from Feature A.
**Why it's wrong:** Creates tight coupling and makes features difficult to test or move.
**Do this instead:** Move shared logic to a common Service (`src/services/`) or Shared Component (`src/components/shared/`).

### Direct DB Access in UI

**What happens:** React components calling `db.table.add()` directly without going through a service or store.
**Why it's wrong:** Bypasses business logic, validation, and makes the UI harder to test.
**Do this instead:** Use a service function in `src/services/` or a store action in `src/features/*/stores/`.

## Error Handling

**Strategy:** Global Error Boundaries + Localized Graceful Degradation.

**Patterns:**
- **UI Safety:** `src/components/shared/ErrorBoundary.tsx` catches rendering crashes.
- **AI Reliability:** `FallbackAIService` handles provider failures by switching models/endpoints.
- **Async Safety:** `try/catch` blocks in services log errors via `src/lib/logger.ts` and return safe defaults or user-friendly errors.

## Cross-Cutting Concerns

**Logging:** Centralized `src/lib/logger.ts` (based on `consola` pattern).
**Validation:** Zod schemas in `src/services/ai/schemas.ts` for AI responses.
**Authentication:** Managed via `src/features/landing/` (Simple local-first auth/keys).

---

*Architecture analysis: 2026-09-16*
