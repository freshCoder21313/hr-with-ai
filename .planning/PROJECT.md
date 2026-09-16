# PROJECT.md — hr-with-ai

**Project:** `hr-with-ai` — Intelligent HR Assistant  
**Type:** React SPA + Capacitor Mobile (local-first)  
**Repo:** `hr-with-ai` (React 18 + TypeScript 5.9 + Vite 6 + Tailwind v4)  
**Version:** `0.0.0` (pre-release, `master` is default branch)  
**Last synthesized:** 2026-09-16

---

## 1. Core Purpose

hr-with-ai is a **local-first, AI-powered HR companion** that helps candidates prepare for hiring workflows end-to-end:

- **Parse & understand resumes** (PDF.js → AI extraction → structured `Resume` domain).
- **Build & tailor resumes** (Resume Builder + CV Studio with AI critique, templates, drag-and-drop).
- **Practice interviews** (mock interview sessions with code editor, whiteboard (tldraw), voice mode, streaming AI feedback).
- **Recommend & match jobs** (JD analysis, match scoring, company intel research).
- **Track progress** (history, skill radar, learning paths) with **offline persistence + optional cloud sync**.

The product is **mature in features, early in platform maturity** — one-line diagnosis from the living roadmap: *"Product features are mature and recent refactors are solid — but repo hygiene and CI were broken in ways that hide regressions, and large UI/prompt modules still dominate change risk."*

> Source: `docs/IMPROVEMENT_ROADMAP.md` §1 (living plan, 2026-07-09) — **authoritative over** `TECHNICAL_DEBT_REPORT.md` (superseded 2026-07-09, retained as historical snapshot only).

## 2. Context & Audience

- **Primary user:** Job seeker / candidate preparing resumes and interviews on web or Android (Capacitor WebView via `file://`).
- **Secondary:** Agents/automation (see `AGENTS.md`) operating the codebase — strict conventions, `HashRouter` for Capacitor, `feat → services → lib/types` dependency rule.
- **Data sensitivity:** All personal data (resumes, interviews, API keys) lives in **IndexedDB (`VietPhongDB` via Dexie)** on-device; cloud backup is opt-in encrypted JSONB in Neon Postgres via Vercel `api/sync.ts`.

## 3. Stack (authoritative: `src/` analysis 2026-09-16)

| Layer | Choice | Notes |
|-------|--------|-------|
| **UI** | React 18.3.1, React Router v7 (`HashRouter`), Radix UI, Tailwind v4, lucide-react, Recharts/Mermaid | `src/features/*` feature isolation; `src/components/ui` primitives |
| **State** | Zustand 5 (domain), React Context (Theme/Auth), local `useState` (ephemeral) | Policy: ADR 001 |
| **Persistence** | Dexie 4.3 (IndexedDB) + LZ-String compression | DB `VietPhongDB`, versions 2→13; ADR 002 |
| **AI** | `src/services/ai/` — AIService + strategies (google-gemini, openai-custom, anthropic, openrouter), Zod schemas, fallback | Keys in IndexedDB, never `VITE_` secrets |
| **Build** | Vite 6.4, TypeScript 5.9 (strict, `no any`), ESLint 8, Prettier 3, Vitest 4 + Playwright 1.61 | `tsc --noEmit` / `lint` / `format:check` gates |
| **Mobile** | Capacitor 8.2 | `npm run android` → `npx cap sync` |
| **Backend** | Vercel serverless (`api/sync.ts`, `@neondatabase/serverless`, `bcryptjs`, `axios`) | `DATABASE_URL`, `ALLOWED_ORIGIN`, `RATE_LIMIT` (server-only) |

## 4. Architecture (see `.planning/codebase/ARCHITECTURE.md`)

```
features (UI) → services → lib / types          (ADR 000, locked)
     ↓              ↓            ↓
  React/Zustand  AI/Prompts   Dexie/Logger/Zod/Types
```

- **Layers:** `src/features/` (screens + hooks + stores) → `src/services/` (AI, interview, resume, jobs, voice, prompts) → `src/lib/` + `src/types/` (infra & domain). **Services never import from features** (enforced).
- **Key services:** `AIService` (`ai.service.ts`), `PromptSystem` split to `src/services/prompts/*`, `SyncService` (`syncService.ts`), `HRDatabase` (`lib/db.ts`).
- **Data flows:** ChatPanel → `useInterviewStore` → `interviewAIService` → `AIService` (streaming) → store; Dexie hooks compress/decompress `parsedData` ↔ `compressedData`.
- **Constraints:** `HashRouter` required (Capacitor `file://`); large objects in IndexedDB not localStorage; API keys via Settings modal, not env.

## 5. Decisions (locked ADRs — highest precedence)

| ADR | Decision | Status |
|-----|----------|--------|
| **ADR 000** `docs/adr/000-dependency-direction.md` | `features → services → lib/types`; `services` must not import `features`; AI core under `services/ai`, prompts under `services/prompts` | **Accepted, locked** |
| **ADR 001** `docs/adr/001-state-management.md` | Zustand for cross-route domain; `useState` for ephemeral UI; Dexie for persistence; Context for app-shell only | **Accepted, locked** |
| **ADR 002** `docs/adr/002-dexie-migrations.md` | Never remove/renumber Dexie versions 2→13; LZ-String compress resumes; hooks for transforms | **Accepted, locked** |

Any conflict between docs is resolved by **ADR > SPEC > PRD > DOC**; locked ADRs win over all. `TECHNICAL_DEBT_REPORT.md` is explicitly superseded — `IMPROVEMENT_ROADMAP.md` is the living debt truth.

## 6. Product Feature Map (condensed)

`interview` · `resume-analysis` · `resume-builder` · `cv-studio` · `skill-assessment` · `dashboard` (SetupRoom) · `history` · `landing` · `sync` (cloud backup) · `AI provider profiles`

See `REQUIREMENTS.md` for full feature/acceptance inventory; `docs/superpowers/specs/2026-03-13-smart-tailor-job-persistence-design.md` (Approved SPEC) adds Smart Tailor job persistence (Zustand+localStorage, global/per-job prompts, import/export).

## 7. Non-Goals (from roadmap §7)

- Full rewrite / Next.js migration
- React 19 + tldraw 5 in same sprint as CI fixes
- 80% coverage everywhere in one quarter
- Building RAG / multi-tenant auth unless product prioritizes
- Rewriting Android native layer beyond Capacitor sync

## 8. Source Provenance

- **DOC (AGENTS.md):** Stack/commands/conventions, import order, dependency direction, AI prompt location.
- **DOC (IMPROVEMENT_ROADMAP.md, living):** Platform trust assessment, phased plan, target outcomes, risk register — **wins over** TECHNICAL_DEBT_REPORT for planning.
- **DOC (TECHNICAL_DEBT_REPORT.md, superseded):** Historical debt snapshot (780/1000 score, 188 `any`, 7 god files, 26.9% coverage) — kept for context, not for forward planning.
- **SPEC (Smart Tailor, Approved):** Zustand job persistence design — overrides informal DOC mentions of `company-intel` stub.
- **Codebase map (7 files, 2026-09-16):** Ground truth for stack, structure, concerns, integrations, testing, conventions, architecture — used to validate roadmap claims (e.g., god files now split per roadmap checklists).

---
*Synthesized from 4 classifications + 7 codebase maps + 3 ADRs + 1 SPEC. Superseded handling: TECHNICAL_DEBT_REPORT → archive, IMPROVEMENT_ROADMAP → active.*
