# ADR 001: State management policy

**Status:** Accepted  
**Date:** 2026-07-09  
**Context:** Phase 1 architecture boundaries (`docs/IMPROVEMENT_ROADMAP.md`)

## Decision

| Kind of state | Where it lives | Examples |
|---------------|----------------|----------|
| **Cross-route / shared domain** | Zustand store under the owning feature or service | Interview session (`interviewStore`), AI service instance (`useAIStore`), CV jobs (`useJobStore`), skill assessment |
| **Ephemeral UI for one screen** | `useState` / `useReducer` in the page or a dedicated hook | Modal open flags, local form drafts, panel resize |
| **Server / IndexedDB persistence** | Service + Dexie (`src/lib/db.ts`, `src/services/core/*`) — not React state as source of truth | Interviews, resumes, user settings |
| **Theme / app shell** | React Context is acceptable for non-domain cross-cutting UI | Theme provider |

## Rules

1. **Do not put** pure UI flags (isModalOpen, activeTab) into Zustand unless multiple distant routes need them.
2. **Do put** session data that survives navigation (active interview id, messages, AI client) in a store or DB.
3. **One store per domain**, colocated with the feature (`src/features/<feature>/stores/` or `*Store.ts`). Shared AI factory lives in `src/services/ai/`.
4. Prefer **selectors** over whole-store subscriptions to limit re-renders.
5. Async I/O belongs in **services/hooks**, not inside store action bodies beyond simple orchestration.

## Consequences

- InterviewRoom and SetupRoom keep local UI state; domain data flows through stores/services.
- New features default to: local state first → promote to Zustand only when a second consumer appears.
