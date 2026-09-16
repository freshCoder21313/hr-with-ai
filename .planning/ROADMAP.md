# ROADMAP.md — hr-with-ai

**Strategy:** Living plan `docs/IMPROVEMENT_ROADMAP.md` (2026-07-09) is the execution spine; it already subsumes and supersedes `TECHNICAL_DEBT_REPORT.md` (historical, 2026-06-08). This roadmap mirrors its 7 phases verbatim, adds explicit debt-remediation tying, and maps codebase concerns to next steps. Precedence: `ADR > SPEC > PRD > DOC`.

**Target outcomes (8–12 weeks):** CI green on `master`/`main`, lockfile tracked, 0 high/critical vulns, 0 files >400 LOC, 0 `services→features` imports, ≥50% services+stores / ≥40% overall coverage, 3 E2E smokes, logger-only prod, empty dirs eliminated, single debt truth.

---

## Phase 0 — Platform Trust (1–3 days) 🔥 — **COMPLETE**

**Goal:** Every push trustworthy.

| # | Task | Done when | Status |
|---|------|-----------|--------|
| 0.1 | Align CI branches (`master` + `main`) | `ci.yml` triggers both; PRs run | ✅ `ci.yml` already `branches: [master, main]` |
| 0.2 | Stop ignoring `package-lock.json` | Removed from `.gitignore`; `npm ci` clean | ✅ `.gitignore` no longer lists lockfile |
| 0.3 | `npm run format` across repo | `format:check` green (51 files) | ✅ Prettier clean (roadmap checklist) |
| 0.4 | `npm audit fix` non-force + targeted bumps (vite/ws) | 0 high/critical (15 low/moderate remain) | ✅ 0 high/critical; `overrides: undici/minimatch/path-to-regexp` present |
| 0.5 | Unify env vars (`VITE_*` client, server vars separate) | `.env.example` / README / AGENTS agree | ✅ `.env.example` + `AGENTS.md` §6 unified |
| 0.6 | Coverage job (report only) | `test:coverage` + artifact visible | ✅ `ci.yml` `Coverage Report` + upload-artifact |

**Exit:** Green CI on test PR; `lint + typecheck + format:check + vitest run` pass. **Debt remediated:** CI never ran, non-reproducible installs, format gate red — hidden regression risk eliminated.

---

## Phase 1 — Architecture Boundaries (1–2 weeks) — **COMPLETE**

**Goal:** Clean layering `features → services → lib/types`.

| # | Task | Done when | Status |
|---|------|-----------|--------|
| 1.1 | Move AI core out of `features/` → `services/ai` | No `services/**` imports from `@/features/**` | ✅ `AIService/strategies/schemas` under `services/ai`; shims in `features/ai-provider` |
| 1.2 | Split `promptSystem.ts` (447 LOC) by domain | `prompts/interview|feedback|jd|resume|company|jobs` + index, each <200 LOC | ✅ `src/services/prompts/*` + `src/services/interview/promptSystem.ts` re-export |
| 1.3 | Normalize Interview types (`mode` vs `type`) | One field content type, one interaction mode + resolvers/Zod guards | ✅ `InterviewContentType` / `InterviewInteractionMode` per `AGENTS.md` §6 + `types/interview.ts` |
| 1.4 | Delete/implement empty `company-intel` / `interview-room` | No empty dirs under `features/` | ✅ Only 8 real features remain (`cv-studio`, `dashboard`, `history`, `interview`, `landing`, `resume-*`, `skill-assessment`) |
| 1.5 | Document state policy (ADR 001) | Short ADR exists | ✅ `docs/adr/001-state-management.md` (Zustand/local/Dexie/Context) + ADR 000 |

**Exit:** `rg "from '@/features" src/services` empty; AGENTS updated. Remediates: inverted dependency, prompt monolith, domain ambiguity, empty shells, fragmentation.

---

## Phase 2 — Decompose Hotspots (2–3 weeks) — **MOSTLY COMPLETE**

**Goal:** Shrink blast radius of files people touch most.

| Priority | Module (LOC before) | Split into | Status |
|----------|---------------------|------------|--------|
| 1 | `InterviewRoom.tsx` (458) | Layout shell + header, chat panel, tools (code/whiteboard), voice controls, modals; hooks `useSuggestedAction`, `useInterviewHints`, `useInterviewRoomBootstrap`, `useToolHandlers` | ✅ ~239 LOC shell |
| 2 | `FeedbackView.tsx` (477) | Score header, analysis sections, charts/mermaid, resources; `useFeedbackData` | ✅ ~100 LOC shell |
| 3 | `JobRecommendationModal.tsx` (457) | List, match details, resume picker, actions; `useJobRecommendationFlow` | ✅ ~81 LOC shell |
| 4 | `useSetupRoom.ts` (386) | `useSetupJobs` / `useSetupResumes` / `useSetupAIActions` composer | ✅ ~134 LOC |
| 5 | `CloudSyncModal.tsx` (378) | UI vs `syncService` via `useCloudSync` | ✅ UI-thin already |
| 6 | SectionForms (731 LOC across 5) | Shared `EntryListForm` primitive (`entry-list.shared`) | 🟡 Partially done — duplication reduced, unify remaining `handleChange`/`handleAnalyze` |
| 7 | `AIProviderProfilesEditor` (771) | `ProfileList` / `ProfileEditor` / `FallbackSettings` + `useAIProviderSettings` | ⬜ Next (CONCERNS §Tech Debt) |
| 8 | `ResumeBuilder` (552) + `UploadStep` (416) + `useCVStudio` (406) | Header/Tabs/TourManager; job CRUD vs chat vs template hooks | 🟡 ResumeBuilder split in progress; UploadStep/useCVStudio queued |

**Exit:** No prod TSX/TS >350 LOC without `// @god-file-approved` + reason; each split has focused test.

---

## Phase 3 — Test & Quality Gates (2–3 weeks, parallel with Phase 2) — **MOSTLY COMPLETE**

**Goal:** Catch regressions before users do.

| # | Task | Detail | Status |
|---|------|--------|--------|
| 3.1 | Raise coverage (services/core, services/ai, stores) | ≥60% lines for sync, AI config, interview AI, validation | 🟡 `syncService` ~72% ✅; remaining services/stores to 60% still in progress (floor 20% today) |
| 3.2 | Quiet tests | Mock Dexie fully; no `MissingAPIError` stderr | ✅ Logger silent in test; Dexie mocks in AI config tests |
| 3.3 | Playwright smoke (3 journeys) | landing→setup, resume builder load, mock AI with fixtures | ✅ Skeleton `e2e/smoke.spec.ts` + CI `e2e` job (needs expansion with MSW fixtures) |
| 3.4 | CI thresholds | Fail PR if coverage drops >2% or critical < floor | ✅ `vitest` thresholds 20% lines/statements floor + CI artifact |
| 3.5 | ESLint harden | `no-explicit-any: error`, ban `console.log` | ✅ `eslint` rules active |
| 3.6 | Logger | `src/lib/logger.ts` no-op/debug in prod | ✅ Logger exists; ~111 `console.*` sites migrating gradually |

**Exit:** Coverage report in CI; 3 smokes green; `any` cannot enter new code. Forward: lift overall 20%→40%, critical 20%→60%.

---

## Phase 4 — Security & Data (1–2 weeks) — **COMPLETE**

| # | Task | Status |
|---|------|--------|
| 4.1 | Vuln remediation (0 high/critical; moderate `tldraw`/`smol-toml` deferred with docs) | ✅ `docs/SECURITY.md` §1 |
| 4.2 | Sync hardening (`api/sync.ts`: size cap, password min, shape validation, safe logs, bcrypt) | ✅ |
| 4.3 | Client secret handling (only `VITE_API_URL` client; keys local) | ✅ policy documented |
| 4.4 | Dexie migration policy (ADR 002 + compress/decompress tests) | ✅ `docs/adr/002-dexie-migrations.md` + `resumeCompression` tests |
| 4.5 | Privacy UX (cloud export "sensitive data excluded" messaging) | ✅ banner + success copy |

---

## Phase 5 — Performance & Mobile (ongoing / 2 weeks focused) — **NEXT**

| # | Task | Detail | Priority |
|---|------|--------|----------|
| 5.1 | Route-level code-split audit | Verify mermaid/tldraw/monaco lazy; build analyzer | Medium |
| 5.2 | Capacitor perf pass | Cold start, IndexedDB pagination/archive, large whiteboard JSON | Medium |
| 5.3 | Image/PDF paths | Lazy `pdfjs-dist`; cap resume size | Medium |
| 5.4 | React 19 / tldraw 5 / Vite 8 / ESLint 10 upgrades | Separate milestone after 0–3 green (explicit non-goal until then) | Deferred |
| 5.5 | Bundle heaviness | Audit `manualChunks` (react/monaco/mermaid/tldraw/AI/PDF) already configured | Low |

**Debt tied:** CONCERNS scaling limits (IndexedDB fetch thousands), large re-renders in `ResumeBuilder` (memo + store split).

---

## Phase 6 — Product Finish / Scope Control (1–2 weeks + product decisions) — **PLANNED**

| # | Decision | Options | Owner |
|---|----------|---------|-------|
| 6.1 | Company intel | Ship MVP (reuse interview company research) or delete stub (stub already deleted) | Product |
| 6.2 | RAG / job rec backlog | Backlog with owners or archive `plans/` → `docs/backlog/` (stop gitignoring useful plans) | Product |
| 6.3 | Versioning | Semver from `0.1.0`; tag releases so CI `release` job works (currently `0.0.0`) | Eng |
| 6.4 | Docs single source | Deprecate old debt reports with banner pointing here; refresh `AGENTS.md` (done) | Eng |
| 6.5 | **Smart Tailor SPEC (Approved 2026-03-13)** | Implement/verify `JobStore` (`useJobStore.ts` + `SmartTailorPage` actions/import-export/batch tailoring) — supersedes empty feature shells | Eng |

---

## Debt-Remediation Swimlane (cross-phase)

| Debt (historical → living) | Remediation PRs | Phase(s) |
|----------------------------|-----------------|----------|
| God components 7×>400 LOC, 41×>200 LOC | PR 7 refactor(interview): extract sections | 2 |
| Duplicated SectionForms 15-20% overlap | Shared `EntryListForm` primitive | 2 |
| `any` 188 → ~10, `any` not banned | ESLint `no-explicit-any: error` | 3 |
| `console.*` 108–111, `alert` 34 | Logger + `no-console` | 3 |
| 24+ outdated deps, 7 major lags | `audit fix` + staggered majors (React/tldraw deferred) | 0, 5 |
| 26.9% stmts / 14 test files / 0 E2E | Coverage raise + Playwright smoke + thresholds | 3 |
| Service ↔ feature circular dep | AI core relocation + prompt split | 1 |
| Dexie v2→13 ladder / migration bloat | ADR 002 + compression tests | 4 |
| Empty feature shells | Deleted | 1 |

---

## Execution Order (first 10 PRs — roadmap §6, already landed or next)

| PR | Title | Phase | Risk | Status |
|----|-------|-------|------|--------|
| 1 | fix(ci): trigger on `master` + format green | 0 | Low | ✅ |
| 2 | chore: track package-lock; fix `npm ci` | 0 | Low | ✅ |
| 3 | chore(deps): audit fix safe bumps | 0 | Medium | ✅ |
| 4 | docs: unify env vars + AGENTS accuracy | 0 | Low | ✅ |
| 5 | refactor(ai): move AIService/strategies under services | 1 | Medium | ✅ |
| 6 | refactor(prompts): split promptSystem by domain | 1 | Medium | ✅ |
| 7 | refactor(interview): extract InterviewRoom sections | 2 | High | ✅ |
| 8 | test: raise sync + AI config coverage + quiet Dexie | 3 | Low | ✅ |
| 9 | test(e2e): Playwright smoke skeleton | 3 | Medium | ✅ |
| 10 | chore: logger + ban console.log / no-explicit-any | 3 | Medium | ✅ |

**Next PRs (this roadmap):** 11 `refactor(resume-builder): EntryListForm + AIProviderProfilesEditor split`, 12 `test: critical coverage 20%→50% + E2E fixtures`, 13 `perf: Capacitor + bundle audit`, 14 `feat(smart-tailor): verify JobStore import/export + batch prompt`.

## Non-Goals (again)

No Next.js rewrite, no simultaneous React 19 + tldraw 5, no 80% everywhere in one quarter, no RAG/multi-tenant unless prioritized, no native Android rewrite.

---

*All phase checklists sourced from `IMPROVEMENT_ROADMAP.md` §5 + appendices; `TECHNICAL_DEBT_REPORT.md` remediation plan (S1/S2/S3, ROI 535%) is archive — its useful tasks are already folded into phases above where they overlap, and deprioritized where they conflict (e.g., React 19 timing).*
