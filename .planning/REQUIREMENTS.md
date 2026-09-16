# REQUIREMENTS.md — hr-with-ai

**Source policy:** `ADR > SPEC > PRD > DOC`. `IMPROVEMENT_ROADMAP.md` (living) supersedes `TECHNICAL_DEBT_REPORT.md` (superseded 2026-07-09) for forward requirements. Codebase map (`.planning/codebase/*`, 2026-09-16) is ground truth for existing implementation.

---

## A. Functional Requirements — Product Features

### FR-01 — Interview (Mock Interview & Feedback)
- **Description:** Candidate practices interviews via text or voice; AI streams responses; whiteboard (tldraw) + Monaco code editor available; hints, job-context, and post-interview feedback with charts/mermaid.
- **Sources:** `AGENTS.md`; `src/features/interview/*` (InterviewRoom, FeedbackView, ChatPanel, VoiceInterviewRoom); `src/services/interview/*`; `ARCHITECTURE.md` flow.
- **Acceptance:**
  - Text chat (`ChatPanel`/`ChatArea`/`InputArea`) sends to `interviewAIService.streamInterviewMessage` → `AIService` (provider strategies) → streamed chunks render in real time.
  - Voice mode (`useVoiceInterview`, STT/TTS/audioRecorder) orchestrates audio without overlap (fragile — requires device testing; low coverage 23.7% per CONCERNS).
  - Code editing (Monaco) and whiteboard (tldraw) persist within session (whiteboard JSON in `Interview`).
  - Feedback generation produces structured output (Zod-validated) with score header, analysis sections, charts.
  - Session persisted to Dexie `interviews` (indexed by `createdAt`, `status`), `updatedAt` maintained via hooks.
  - Routing via `HashRouter`.
- **Domain types:** `src/types/interview.ts` — `InterviewContentType` vs `InterviewInteractionMode` (normalized per roadmap Phase 1.3).
- **Status:** Implemented; god components split per roadmap Phase 2 (InterviewRoom ~239 LOC shell, FeedbackView ~100 LOC shell).

### FR-02 — Resume Analysis (Parsing & Parsing Pipeline)
- **Description:** Upload PDF → pdfjs-dist parse → AI extraction → structured `Resume` (`parsedData`) stored compressed.
- **Sources:** `src/features/resume-analysis/*`; `src/services/resume/resumeParser.ts`, `resumeAIService.ts`; `src/lib/db.ts` compression hooks.
- **Acceptance:**
  - `resumeParser` extracts text from PDF; `resumeAIService` produces structured resume via `generateStructured` + Zod.
  - `Resume` stored via `db.resumes` — on create/update `parsedData` → `compressedData` (LZ-String UTF-16); on read decompressed transparently; `src/lib/resumeCompression.ts` pure helpers unit-tested (ADR 002).
  - Failure to compress/decompress logged via `logger.error`, not silently dropped.
- **Status:** Implemented.

### FR-03 — Resume Builder
- **Description:** Editable resume sections (Work, Education, Projects, Skills, etc.) with per-section AI critique (`Wand2`), templates (Modern/Classic/Academic), preview, print, drag-and-drop ordering, tour.
- **Sources:** `src/features/resume-builder/*` (ResumeBuilder.tsx, SectionForms/*, templates, ResumePreview); `CONCERNS.md` duplication note.
- **Acceptance:**
  - Each `SectionForms/*` supports `handleChange<K extends keyof T>`, Card/Input/Button CRUD (+ Plus/Trash2), and `handleAnalyze` AI critique — duplication being consolidated via shared `EntryListForm` primitive (ROADMAP Phase 2 item 6).
  - Preview memoized to avoid full re-render on single field change.
  - Templates render via `html-to-image` + `react-joyride` tour.
- **Status:** Implemented; hotspot `ResumeBuilder 552 LOC` decomposed (BuilderHeader/Tabs/TourManager per concerns fix).

### FR-04 — CV Studio (Tailoring & Chat)
- **Description:** Job-aware CV generation: manage saved jobs, tailor resume to JD, chat refinement, template switching, change review.
- **Sources:** `src/features/cv-studio/*` (CVStudioPage, useCVStudio, useCVChat, useCVTailoring, CVJobPanel, CVChatPanel); `src/services/jobs/*`, `src/services/resume/cvChatService.ts`.
- **Acceptance:**
  - `useCVStudio` (god hook 406 LOC — being split) orchestrates job CRUD, generation, chat, template switching.
  - `useCVChat` / `useCVTailoring` cover chat + tailoring flows; tested (`useCVChat.test.ts`, `useCVTailoring.test.ts`).
  - Jobs persisted (`useJobStore` + Dexie `jobs` v12); Zod-validated AI output.
- **Status:** Implemented; hotspot split planned per roadmap.

### FR-05 — Dashboard / SetupRoom
- **Description:** Entry point after landing: select resume, research company, start interview. Orchestrates resume parsing, company intel, job recs.
- **Sources:** `src/features/dashboard/*` (SetupRoom.tsx, useSetupRoom.ts + splits `useSetupJobs`/`useSetupResumes`/`useSetupAIActions`); `CONCERNS.md`.
- **Acceptance:**
  - `SetupRoom` (~134 LOC composer after split) delegates to `useSetupJobs` (job recs), `useSetupResumes` (parse pipeline), `useSetupAIActions` (company research + start).
  - No `any`, `console.log` banned — uses `logger`.
- **Status:** Implemented; `useSetupRoom` 386→134 LOC per roadmap checklist.

### FR-06 — History & Analytics
- **Description:** Past interviews/resumes, learning path, progress charts, shareable result cards.
- **Sources:** `src/features/history/*` (HistoryPage, LearningPath, ProgressCharts, SkillRadarChart, ShareableResultCard/ShareModal); Dexie `interviews` pagination concern.
- **Acceptance:**
  - Lists paginated (IndexedDB 50MB+ limit → archive path for large datasets per CONCERNS).
  - Charts via Recharts; share via `html-to-image`.
- **Status:** Implemented.

### FR-07 — Skill Assessment
- **Description:** Upload step + assessment flow for candidate skills.
- **Sources:** `src/features/skill-assessment/*` (UploadStep 416 LOC hotspot); `CONCERNS` not yet split — tracked in roadmap Phase 2 extensions.
- **Acceptance:** Upload → AI evaluation → results. File size/cap handling TBD (linked to performance Phase 5).
- **Status:** Partially implemented.

### FR-08 — AI Provider Management (Multi-Provider)
- **Description:** User-managed AI provider profiles (Gemini primary, OpenAI, Anthropic, OpenRouter, custom OpenAI-compatible), model fetching, fallback orchestration, profile CRUD.
- **Sources:** `src/services/ai/*` (AIService, strategies, aiConfigService, aiProfileService, fallbackAIService), `src/components/shared/AIProviderProfilesEditor.tsx` (771 LOC god component).
- **Acceptance:**
  - `AIProviderStrategy` defines `generateText`/`streamText` (+ `systemInstruction` support added per debt report §1.2).
  - `FallbackAIService` switches providers on failure; `generateStructured` + Zod validates.
  - Profiles stored in Dexie `userSettings` + `aiConfigService`; manual blacklist strips secrets on sync export.
  - UI: `AIProviderProfilesEditor` to be split into `ProfileList`/`ProfileEditor`/`FallbackSettings` + `useAIProviderSettings` hook.
- **Status:** Implemented; core moved to `services/ai` per ADR 000 (Phase 1 done); shims under `features/ai-provider` temporary.

### FR-09 — Cloud Sync & Backup
- **Description:** Optional encrypted backup/restore of IndexedDB (interviews, resumes, settings sans secrets) to Neon Postgres via Vercel `api/sync.ts`.
- **Sources:** `api/sync.ts`; `src/services/core/syncService.ts` (+ tests 72% lines); `docs/SECURITY.md` threat model; INTEGRATIONS.md.
- **Acceptance:**
  - Client: `x-sync-id` + `bcryptjs` password; export strips `githubToken`, `googleCloudApiKey`, `elevenLabsApiKey`, etc. (manual blacklist → future `Secret` type); preserves local keys on import; syncs `localStorage`.
  - Server: 16-char ID via `crypto.getRandomValues`, bcrypt hash on POST, per-IP in-memory rate limit (multi-instance caveat), payload size cap, `ALLOWED_ORIGIN` CORS, no secret logging.
  - UI: `CloudSyncModal` (378 LOC) is UI-thin via `useCloudSync` hook (no further split needed per Phase 2 checklist).
  - GET is unauthenticated by design (ID secrecy); password protects overwrite.
- **Status:** Implemented & hardened (Phase 4).

### FR-10 — Landing & Auth
- **Description:** Landing page with simple local-first auth / key entry modals (ApiKeyModal, SettingsModal, CloudSyncModal).
- **Sources:** `src/features/landing/*`; `src/components/shared/*` modals; INTEGRATIONS.md.
- **Acceptance:**
  - Modal boilerplate consolidated (was duplicated across 3 modals).
  - Keys stored in `UserSettings` (IndexedDB), never in `VITE_` env.
- **Status:** Implemented.

### FR-11 — Smart Tailor — Job Persistence & Customization (SPEC, Approved 2026-03-13)
- **Description:** Enhance CV/Resume tailoring with persistent Job Targets, global + per-job prompt customization, and import/export. (Precedence: SPEC > DOC — overrides empty `company-intel`/`interview-room` stubs.)
- **Source:** `docs/superpowers/specs/2026-03-13-smart-tailor-job-persistence-design.md` (Approved) **+** codebase `cv-studio/useJobStore` actualization.
- **Acceptance:**
  - `Job { id, company, title, description, customPrompt }` + `JobStore { jobs, globalPrompt, actions:{add,update,delete,import,setGlobalPrompt}}` via Zustand `persist` → `localStorage` at `src/features/smart-tailor/stores/useJobStore.ts` (spec) / `src/features/cv-studio/stores/useJobStore.ts` (implemented).
  - Actions UI: Edit Global Prompt modal, Import `.json` (try/catch + schema validation + new ID generation per import), Export `jobs-backup.json`, selection checkboxes, per-card `customPrompt` textarea, persistent note: *"Jobs and Prompts are saved locally … Use Export for backups."*
  - Batch workflow: *Start Tailoring Selected Jobs* runs on checked jobs only; prompt = `${globalPrompt}\n\n--- Job-Specific Instructions ---\n${customPrompt}` (omit section if empty).
  - Error handling: invalid JSON/structure → user notification, import aborted.
- **Conflict note:** Existing `company-intel/` and `interview-room/` empty dirs per roadmap P1-5 are deleted/implemented; Smart Tailor SPEC is the approved scope for job-target intelligence (not ad-hoc stubs).
- **Status:** Spec approved; store+UI spec'd — implement/verify against existing `useJobStore` implementation.

---

## B. Non-Functional & Quality Requirements

### NFR-01 — Architecture Boundaries (locked)
- **Requirement:** Enforce `features → services → lib/types`; zero `services → features` imports. AI core in `services/ai`, prompts domain-split in `services/prompts`.
- **Source:** ADR 000 (locked) — wins over any DOC/SPEC that assumes opposite.
- **Verification:** `rg "from '@/features" src/services` == empty (roadmap Phase 1 exit criterion).
- **Status:** ✅ Done per roadmap Phase 1 checklist (all 5 items checked).

### NFR-02 — State Management Discipline
- **Requirement:** Zustand for cross-route domain; `useState` for ephemeral UI; Dexie is source of truth for interviews/resumes/settings; Context only for theme/app-shell. One store per domain, colocated.
- **Source:** ADR 001 (locked).
- **Status:** ✅ Documented & applied (InterviewRoom/SetupRoom keep local UI; stores for session/AI/jobs).

### NFR-03 — Data Persistence & Migrations
- **Requirement:** Dexie `VietPhongDB` versions 2→13 preserved; additive only; LZ-String compression for resumes; pure helpers testable; no history rewrite.
- **Source:** ADR 002 (locked).
- **Verification:** `resumeCompression` unit tests; upgrade hook tests.
- **Status:** ✅ Done (Phase 4 checklist: ADR 002 + compression tests).

### NFR-04 — Code Quality Gates
- **Requirement (targets per IMPROVEMENT_ROADMAP §4):**
  - Files >400 LOC → 0 (or `// @god-file-approved` + justification); target <350 LOC.
  - ESLint: `no-explicit-any: error`, ban `console.log` (allow via `logger` only).
  - Prettier clean (51 files fixed), CI must run on `master` **and** `main` (was broken → fixed).
  - `package-lock.json` tracked (was gitignored → fixed, `npm ci` works).
  - High/critical audit vulns → 0 (15 low/moderate remaining: tldraw/nanoid, smol-toml deferred per `SECURITY.md`).
  - `any` → 0 (was 188 / 82 residual; now ~10 mentions, banned for new code).
- **Source:** IMPROVEMENT_ROADMAP §4 & §5 Phase 0/3 (supersedes debt report's looser 780→400 score plan).
- **Status:** Phase 0 ✅ (all 6 items checked); Phase 3 logger+ESLint ✅

### NFR-05 — Testing & Coverage
- **Requirement:**
  - Critical packages (services/core, services/ai, stores) ≥50–60% lines; overall ≥40% (roadmap target vs historical 26.9% stmts / 20.8% funcs / 19.5% branches).
  - 3 Playwright E2E smokes: (1) landing→setup form, (2) resume builder load, (3) mock AI path with fixtures (MSW/mock strategy).
  - Quiet tests (no Dexie `MissingAPIError` stderr spam via full mocks).
  - CI thresholds: fail PR if overall coverage drops >2% or critical packages below floor; floor currently 20% lines/statements (Phase 3 checklist).
  - No E2E before → skeleton `e2e/smoke.spec.ts` + CI `e2e` job.
- **Source:** IMPROVEMENT_ROADMAP Phase 3; CONCERNS.md gaps (114 source files, 10 test files before).
- **Status:** Partially done — P3-2 quiet tests ✅, syncService ~72% lines ✅, skeleton ✅, thresholds 20% ✅; remaining lift to 50/40% is forward work (ROADMAP Phase 3).

### NFR-06 — Security
- **Requirement:** 0 high/critical vulns (or documented exceptions); secrets handling (AI keys local-only, `VITE_API_URL` only client env); sync hardening (password min, size cap, shape validation, safe logs); Dexie/privacy policy documented.
- **Source:** IMPROVEMENT_ROADMAP Phase 4 + `docs/SECURITY.md` (Phase 4 complete).
- **Status:** ✅ Done (0 high/critical; `api/sync.ts` hardened; secrets policy documented; sync UX privacy banner).

### NFR-07 — Performance & Mobile
- **Requirement:** Route-level code splitting (mermaid/tldraw/monaco/pdfjs lazy); Capacitor cold-start/IndexedDB/whiteboard perf; cap resume size; manualChunks (react, monaco, mermaid, tldraw, AI, PDF) already in place.
- **Source:** IMPROVEMENT_ROADMAP Phase 5; ARCHITECTURE manualChunks; CONCERNS scaling limits.
- **Status:** Ongoing / focused 2-week pass; React 19 / tldraw 5 deferred.

### NFR-08 — Observability & DX
- **Requirement:** `src/lib/logger.ts` abstraction (prod strip, debug hidden, silenced in tests); replace ~111 `console.*` call sites gradually; AGENTS.md accurate (fixed stale examples); single debt truth = this roadmap; error monitoring (Sentry) considered but deferred.
- **Source:** IMPROVEMENT_ROADMAP P1-2/P2-4/P3-1, AGENTS.md, CONVENTIONS.md.
- **Status:** Logger ✅ + ESLint bans ✅; console migration ongoing.

---

## C. Superseded / Archive — Not Forward Requirements

- **`TECHNICAL_DEBT_REPORT.md` (2026-06-08, superseded 2026-07-09):** Historical inventory (debt score 780, 15-20% duplication, 188 `any`, 108 `console`, 34 `alert`, 31 disables, 24+ outdated packages, 7 major lags) and phased ROI plan (S1 24h / S2 72h / S3 156h). **All forward planning uses `IMPROVEMENT_ROADMAP.md` instead.** Retained only to explain deltas (e.g., debt report counted 41 files >200 LOC vs roadmap 7 >340 LOC; report targeted React 19 in S2 vs roadmap defers to Phase 5).
- **`docs/TECHNICAL_DEBT_ANALYSIS.md`, `docs/QUICK_WIN_*`, `aidlc-docs/`, `plans/` (gitignored):** Archive per roadmap P3-1 docs sprawl finding.

---

## D. Traceability Matrix (selected)

| Requirement | Primary Source | Codebase Evidence | Roadmap Phase |
|-------------|---------------|-------------------|---------------|
| FR-11 Smart Tailor | SPEC 2026-03-13 Approved | `src/features/cv-studio/stores/useJobStore.ts` | Phase 6 backlog |
| NFR-01 dependency | ADR 000 locked | `rg` check empty | Phase 1 ✅ |
| NFR-03 Dexie | ADR 002 locked | `src/lib/db.ts`, `resumeCompression.ts` | Phase 4 ✅ |
| NFR-04 gates | IMPROVEMENT_ROADMAP §4 | `.github/workflows/ci.yml`, `.gitignore`, ESLint | Phase 0 ✅ |

*Full phase breakdown in `ROADMAP.md`.*
