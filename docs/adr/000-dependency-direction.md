# ADR 000: Dependency direction

**Status:** Accepted  
**Date:** 2026-07-09

## Decision

Allowed import direction (top may import below, never reverse):

```
UI / pages (features/* components)
  → feature hooks & stores
    → services/*  (AI, sync, domain APIs, prompts)
      → lib/* , types/*
```

- **`src/services/**` must not import from `src/features/**`.**
- AI core (`AIService`, strategies, Zod schemas) lives under `src/services/ai/`.
- Prompt templates live under `src/services/prompts/` (domain-split).
- Thin re-exports under `features/ai-provider/` are temporary compatibility shims only.

## Consequences

- Features depend on services; services stay UI-agnostic and testable.
- Moving a prompt or schema no longer pulls React features into the service layer.
