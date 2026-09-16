# HR-With-AI — Improvement Roadmap

**Branch:** `plan/repo-improvement-roadmap-2026-07`  
**Review date:** 2026-07-09  
**Baseline commit:** `b22f4af` (master, +9 commits ahead of origin)  
**Scope:** Full-repo health review (architecture, quality, tests, security, DX, product)

---

## 1. Executive snapshot

| Area | Current state | Verdict |
|------|---------------|---------|
| **Typecheck** | Clean (`tsc --noEmit`) | ✅ Healthy |
| **ESLint** | Clean | ✅ Healthy |
| **Unit/integration tests** | **90/90 pass**, 21 test files | ⚠️ Pass rate good, coverage still thin |
| **Prettier** | **51 files** fail `format:check` | ❌ Would fail CI |
| **CI** | Workflow targets **`main`**; default branch is **`master`** | ❌ CI effectively never runs |
| **Lockfile** | `package-lock.json` is **gitignored** | ❌ Non-reproducible installs / `npm ci` broken |
| **npm audit** | **40 vulns** (1 critical, 19 high) | ❌ Action needed |
| **Architecture** | Feature folders + services, but **layering inverted** | ⚠️ Structural debt |
| **God files** | 7 files still **>340 LOC** (Interview, Feedback, prompts) | ⚠️ Maintainability risk |
| **Empty stubs** | `company-intel/`, `interview-room/` empty | ⚠️ Noise / incomplete product surface |
| **Docs** | Multiple overlapping debt docs; AGENTS examples stale | ⚠️ DX friction |
| **Product** | Rich feature set (interview, CV studio, builder, skills, sync) | ✅ Strong foundation |

**One-line diagnosis:** Product features are mature and recent refactors (validation centralization, structured AI output, sync hardening, CV Studio splits) are solid — but **repo hygiene and CI are broken in ways that hide regressions**, and **large UI/prompt modules** still dominate change risk.

---

## 2. What is already good (keep / double down)

1. **Feature-oriented structure** under `src/features/` with shared `components/ui`, `services/`, `lib/`.
2. **Lazy routes** in `App.tsx` + Vite `manualChunks` (react, monaco, mermaid, tldraw, AI, PDF).
3. **Multi-provider AI** (`google`, `openai`, `anthropic`, `openrouter`) with `generateStructured` + Zod.
4. **Central validation** (`src/lib/validation/`) — matches prior debt remediation goals.
5. **Sync security** strips API keys / GitHub tokens on export; preserves local secrets on import.
6. **ErrorBoundary + GlobalErrorHandler + Sonner toasts** (no remaining `alert()` in `src/`).
7. **Recent test growth**: 21 files / 90 tests (up from ~14 files / 65 in mid-2026 debt report).
8. **Capacitor Android** path exists for mobile packaging.
9. **AGENTS.md** gives agents a workable contract (commands, import order, stack).

---

## 3. Findings (prioritized)

### P0 — Broken platform / trust (fix first)

| ID | Finding | Evidence | Impact |
|----|---------|----------|--------|
| **P0-1** | CI never runs on default branch | `.github/workflows/ci.yml` triggers on `main`; repo branch is `master` | No automated gate on PRs/pushes |
| **P0-2** | Lockfile ignored | `.gitignore` lists `package-lock.json`; file exists locally but is ignored | `npm ci` fails in CI; floating deps across machines |
| **P0-3** | Format gate red | `npm run format:check` → **51 files** | CI would fail even if branch fixed |
| **P0-4** | High/critical dependency vulns | `npm audit`: vite, ws, undici, uuid, … (**40** total) | Security risk, especially dev tooling & transitive |
| **P0-5** | Env contract inconsistent | README: `VITE_GEMINI_API_KEY`; `.env.example`: `GEMINI_API_KEY` | Onboarding confusion, wrong keys in client |

### P1 — Architecture & maintainability

| ID | Finding | Evidence | Impact |
|----|---------|----------|--------|
| **P1-1** | Inverted dependency: **services → features** | `aiConfigService`, `cvChatService`, `*AIService` import `@/features/ai-provider/*` and prompts | Circular risk; hard to test services in isolation |
| **P1-2** | God components/hooks | `FeedbackView` 477, `InterviewRoom` 458, `JobRecommendationModal` 457, `promptSystem` 447, `useSetupRoom` 386, `CloudSyncModal` 378 | High change-blast radius |
| **P1-3** | Prompt monolith | `src/services/interview/promptSystem.ts` (~447 LOC) mixes interview + adjacent domains | Prompt edits risk unrelated flows |
| **P1-4** | Domain type ambiguity | `Interview.mode` vs `Interview.type`; dual enums (`text/voice` vs coding modes) | Bugs and awkward conditionals |
| **P1-5** | Empty feature shells | `src/features/company-intel/`, `interview-room/` | False structure; confuses navigation |
| **P1-6** | Dexie migration ladder | versions **2 → 13** in `db.ts` without consolidation story for new installs | Cognitive load; migration bugs harder to reason about |
| **P1-7** | State fragmentation | Zustand (interview, AI, jobs, skills, voice) + local mega-`useState` in rooms | No written rule for “store vs local” |

### P2 — Quality, testing, observability

| ID | Finding | Evidence | Impact |
|----|---------|----------|--------|
| **P2-1** | Coverage still low on critical paths | Historical clover ~27% stmts; many UI/AI paths thin | Regressions only found manually |
| **P2-2** | No E2E | No Playwright/Cypress | Cannot guard full interview / CV / sync journeys |
| **P2-3** | Test noise | Dexie `MissingAPIError` stderr; intentional error logs in AI tests | Hides real failures in CI logs |
| **P2-4** | `console.*` still pervasive | ~**111** call sites in `src/` | No structured logging / prod filtering |
| **P2-5** | No production error monitoring | No Sentry/similar | Blind to field failures |
| **P2-6** | `any` mostly gone but not banned | ~10 mentions left; ESLint `no-explicit-any` not error | Regression of type safety possible |

### P3 — Product / DX / hygiene

| ID | Finding | Evidence | Impact |
|----|---------|----------|--------|
| **P3-1** | Docs sprawl | `TECHNICAL_DEBT_REPORT.md`, `docs/TECHNICAL_DEBT_ANALYSIS.md`, `docs/QUICK_WIN_*`, `aidlc-docs/`, `plans/` gitignored | Conflicting advice for agents/humans |
| **P3-2** | AGENTS.md stale examples | References `src/features/auth/Login.test.tsx`, `src/types.ts` | Misleads agents |
| **P3-3** | Version stuck at `0.0.0` | `package.json` | No release discipline despite CI release job |
| **P3-4** | Major deps lag | React 18, ESLint 8, tldraw 2.x, large gap vs latest | Security + future features blocked |
| **P3-5** | Bundle heaviness | mermaid + tldraw + monaco + recharts + pdfjs | Mobile / first-load pain on Capacitor |
| **P3-6** | Sync API rate limit is in-memory | `api/sync.ts` | Weak under multi-instance serverless |
| **P3-7** | Incomplete product surfaces | empty company-intel; planned RAG/cloud items in `plans/` | Scope creep without finish criteria |

---

## 4. Target outcomes (definition of “better”)

Within **~8–12 weeks** of focused work:

| Metric | Baseline (2026-07-09) | Target |
|--------|----------------------|--------|
| CI on default branch | Broken (`main` vs `master`) | Green on every PR |
| `format:check` / lint / typecheck / tests | format fail | All green in CI |
| Lockfile policy | Ignored | Tracked; `npm ci` only |
| npm high+ vulns | 19 high + 1 critical | 0 high/critical (or documented exceptions) |
| Files >400 LOC | 4–7 hotspots | 0 (split or justified) |
| Service → feature imports | Several | 0 (AI core under `services`/`lib`) |
| Statement coverage (critical packages) | ~27% overall (hist.) | **≥50%** services + stores; **≥40%** overall |
| E2E smoke | 0 | 3 journeys (setup→interview, resume edit, sync dry-run) |
| `console.*` in prod paths | ~111 | Logger abstraction + strip in prod |
| Empty feature dirs | 2 | 0 (implement or delete) |
| Single source of debt truth | 3+ reports | This roadmap + quarterly update |

---

## 5. Phased plan

### Phase 0 — Platform trust (1–3 days) 🔥

**Goal:** Make every push trustworthy.

| # | Task | Files / actions | Done when |
|---|------|-----------------|-----------|
| 0.1 | Align CI branches with `master` **or** rename default to `main` | `.github/workflows/ci.yml` | CI runs on PR to default branch |
| 0.2 | **Stop ignoring** `package-lock.json`; commit lockfile | `.gitignore`, lockfile | `npm ci` works clean |
| 0.3 | Run `npm run format` across repo | 51 files | `format:check` green |
| 0.4 | `npm audit fix` (non-force), then targeted bumps (vite/ws) | `package.json` / lock | High vulns reduced; typecheck/tests green |
| 0.5 | Unify env vars once | `.env.example`, README, AGENTS.md | One naming scheme (`VITE_*` for client, server vars documented separately) |
| 0.6 | Optional: add coverage job (report only, no threshold yet) | `ci.yml`, vitest coverage | Artifact/report visible |

**Exit criteria:** Green CI on a test PR; local `lint` + `typecheck` + `format:check` + `vitest run` all pass.

---

### Phase 1 — Architecture boundaries (1–2 weeks)

**Goal:** Clean dependency direction: **UI → features → services → lib/types**.

| # | Task | Approach | Done when |
|---|------|----------|-----------|
| 1.1 | Move AI core out of `features/` | Relocate `AIService`, strategies, schemas to `src/services/ai/` or `src/lib/ai/`; keep thin feature re-exports if needed | No `src/services/**` imports from `@/features/**` |
| 1.2 | Split `promptSystem.ts` by domain | `prompts/interview.ts`, `prompts/feedback.ts`, `prompts/jd.ts`, etc. | Each file <200 LOC; single index |
| 1.3 | Normalize Interview domain types | One field for content type, one for interaction mode; migrate with zod/runtime guards | Types + UI use consistent names |
| 1.4 | Delete or implement empty features | Remove `company-intel`, `interview-room` **or** document milestone | No empty dirs under `features/` |
| 1.5 | Document state policy | Short ADR in `docs/adr/001-state-management.md` | Zustand for cross-route; local for ephemeral UI |

**Exit criteria:** `rg "from '@/features" src/services` returns empty; architecture note in AGENTS.md updated.

### Phase 1 checklist

- [x] P1-1 Move AI core under `services/ai` (+ thin feature re-exports)
- [x] P1-2 Split `promptSystem` → `services/prompts/*`
- [x] P1-3 Normalize Interview content vs interaction types + resolvers
- [x] P1-4 Remove empty feature shells (`company-intel`, `interview-room`)
- [x] P1-5 ADRs + AGENTS dependency/state policy

---

### Phase 2 — Decompose hotspots (2–3 weeks)

**Goal:** Shrink blast radius of the files people touch most.

| Priority | Module | Split into |
|----------|--------|------------|
| 1 | `InterviewRoom.tsx` | Layout shell + header, chat panel, tools (code/whiteboard), voice controls, modals — hooks already partial |
| 2 | `FeedbackView.tsx` | Score header, analysis sections, charts/mermaid, resources |
| 3 | `JobRecommendationModal.tsx` | List, match details, resume picker, actions |
| 4 | `useSetupRoom.ts` | Parse pipeline hook, company research hook, start-interview action |
| 5 | `CloudSyncModal.tsx` | UI vs `syncService` (service already exists — UI-only thin) |
| 6 | SectionForms (if still duplicated) | Shared `EntryListForm` primitive (partially done via `entry-list.shared`) |

**Exit criteria:** No production TSX/TS file >350 LOC without explicit `// @god-file-approved` + reason; each split covered by at least one focused test.

### Phase 2 checklist

- [x] P2-1 Split `InterviewRoom` → hooks (`useSuggestedAction`, `useInterviewHints`, `useInterviewRoomBootstrap`) + wire `useToolHandlers` (~239 LOC shell)
- [x] P2-2 Split `FeedbackView` → `useFeedbackData` + feedback components (~100 LOC shell)
- [x] P2-3 Split `JobRecommendationModal` → `useJobRecommendationFlow` + step components (~81 LOC shell)
- [x] P2-4 Split `useSetupRoom` → `useSetupJobs` / `useSetupResumes` / `useSetupAIActions` (~134 LOC composer)
- [x] P2-5 `CloudSyncModal` already UI-thin via `useCloudSync` (no further split needed this phase)

---

### Phase 3 — Test & quality gates (2–3 weeks, parallel with Phase 2)

**Goal:** Catch regressions before users do.

| # | Task | Detail |
|---|------|--------|
| 3.1 | Raise coverage on **services/core**, **services/ai**, **stores** | Target ≥60% lines for sync, AI config, interview AI, validation |
| 3.2 | Quiet tests | Mock Dexie fully; assert errors without raw stderr spam |
| 3.3 | Add Playwright smoke | (1) landing → setup form, (2) resume builder load, (3) mock AI path with fixtures |
| 3.4 | CI thresholds | After baseline: fail PR if overall coverage drops >2% or critical packages < floor |
| 3.5 | ESLint harden | `@typescript-eslint/no-explicit-any`: error; ban `console.log` in app code (allow `console.error` via logger only) |
| 3.6 | Introduce `logger` | `src/lib/logger.ts` — no-op/debug in prod; replace call sites gradually |

**Exit criteria:** Coverage report in CI; 3 E2E smokes green; `any` cannot enter new code.

### Phase 3 checklist

- [x] P3-1 `logger` + ESLint (`no-explicit-any` error, ban `console.log`)
- [x] P3-2 Quiet tests (logger silent in test; mock Dexie/settings in AI config tests)
- [x] P3-3 Raise critical coverage — syncService ~72% lines; expanded unit tests
- [x] P3-4 Coverage thresholds in vitest (20% lines/statements floor) + CI
- [x] P3-5 Playwright smoke skeleton (`e2e/smoke.spec.ts`, CI `e2e` job)

---

### Phase 4 — Security & data (1–2 weeks)

| # | Task | Detail |
|---|------|--------|
| 4.1 | Finish vuln remediation | Remaining high/critical with break-glass docs if unfixable |
| 4.2 | Sync API hardening | Document threat model; consider durable rate limit; validate payload size; never log secrets |
| 4.3 | Client secret handling | Ensure only `VITE_*` non-secret config in client; keys stay user-local / server env |
| 4.4 | Dexie migration policy | Document “new install starts at vN” story; add tests for compress/decompress resume path |
| 4.5 | Privacy | Export UX: clear “sensitive data excluded” messaging (partially implemented) |

### Phase 4 checklist

- [x] P4-1 `docs/SECURITY.md` — 0 high/critical; moderate tldraw/smol-toml deferred
- [x] P4-2 Harden `api/sync.ts` (payload size, password min, shape validation, safe logs)
- [x] P4-3 Secrets policy documented; client only uses non-secret `VITE_API_URL`
- [x] P4-4 ADR 002 Dexie migrations + `resumeCompression` unit tests
- [x] P4-5 Cloud sync UX privacy banner + success copy for excluded secrets

---

### Phase 5 — Performance & mobile (ongoing / 2 weeks focused)

| # | Task | Detail |
|---|------|--------|
| 5.1 | Route-level code splitting audit | Ensure mermaid/tldraw/monaco only load when needed (verify with build analyzer) |
| 5.2 | Capacitor perf pass | Cold start, IndexedDB size, large whiteboard JSON |
| 5.3 | Image/PDF paths | Lazy pdfjs; cap resume size |
| 5.4 | Consider React 19 **after** Phase 0–3 green | Separate milestone; not on critical path |

---

### Phase 6 — Product finish / scope control (1–2 weeks + product decisions)

| # | Decision needed | Options | Status |
|---|-----------------|---------|--------|
| 6.1 | Company intel | Ship MVP (reuse interview company research) **or** delete stub | ✅ Deleted |
| 6.2 | RAG / job rec plans | Keep as backlog with owners **or** archive `plans/` into `docs/backlog/` and stop gitignoring useful plans | ✅ Archived |
| 6.3 | Versioning | Semver from `0.1.0`; tag releases so existing CI release job works | ✅ v0.1.0 |
| 6.4 | Docs single source | Deprecate old debt reports with banner pointing here; refresh AGENTS.md | ✅ Done |

---

## 6. Suggested execution order (first 10 PRs)

| PR | Title | Phase | Risk |
|----|-------|-------|------|
| 1 | fix(ci): trigger on `master` + format green | 0 | Low |
| 2 | chore: track package-lock; fix npm ci | 0 | Low |
| 3 | chore(deps): audit fix safe bumps | 0 | Medium |
| 4 | docs: unify env vars + AGENTS accuracy | 0 | Low |
| 5 | refactor(ai): move AIService/strategies under services | 1 | Medium |
| 6 | refactor(prompts): split promptSystem by domain | 1 | Medium |
| 7 | refactor(interview): extract InterviewRoom sections | 2 | High |
| 8 | test: raise sync + AI config coverage + quiet Dexie | 3 | Low |
| 9 | test(e2e): Playwright smoke skeleton | 3 | Medium |
| 10 | chore: logger + ban console.log / no-explicit-any | 3 | Medium |

Each PR should: typecheck + lint + format + unit tests green; prefer **atomic commits** per AGENTS workflow.

---

## 7. Explicit non-goals (for this roadmap)

- Full rewrite / Next.js migration  
- React 19 + tldraw 5 in the same sprint as CI fixes  
- 80% coverage everywhere in one quarter  
- Building all of RAG / multi-tenant auth unless product prioritizes them  
- Rewriting Android native layer beyond Capacitor sync  

---

## 8. Ownership & tracking

| Artifact | Role |
|----------|------|
| **This file** (`docs/IMPROVEMENT_ROADMAP.md`) | Living plan; update status checkboxes as PRs land |
| `TECHNICAL_DEBT_REPORT.md` | Historical snapshot (2026-06) — **superseded for planning** |
| `docs/TECHNICAL_DEBT_ANALYSIS.md` | Older/generic — treat as archive |
| `AGENTS.md` | Day-to-day agent contract — update after Phase 0–1 |
| GitHub Projects / issues | Optional: one issue per P0/P1 row |

**Status legend for future edits:**  
`[ ]` not started · `[~]` in progress · `[x]` done · `[-]` cancelled

### Phase 0 checklist

- [x] P0-1 CI branch alignment (`master` + `main`)  
- [x] P0-2 Track package-lock (removed from `.gitignore`)  
- [x] P0-3 Prettier clean  
- [x] P0-4 Audit remediation — **0 high/critical** (was 19 high + 1 critical); 15 low/moderate remain (tldraw/nanoid, smol-toml)  
- [x] P0-5 Env docs unified (`.env.example`, README, AGENTS.md)  
- [x] P0-6 Coverage report in CI (`npm run test:coverage` + artifact)

---

## 9. Risk register

| Risk | Mitigation |
|------|------------|
| Moving AI module breaks imports | Codemod + re-export shims for 1 release |
| Splitting InterviewRoom regressions | Integration test already exists — expand before split |
| Lockfile commit causes huge PR noise | Dedicated PR; no logic changes |
| Audit force-bumps break Vercel node | Prefer non-force; pin `@vercel/node` carefully |
| E2E flaky without real AI | Use mock strategy / MSW fixtures |

---

## 10. Appendix A — Size hotspots (LOC, 2026-07-09)

| LOC | Path |
|-----|------|
| 477 | `src/features/interview/FeedbackView.tsx` |
| 458 | `src/features/interview/InterviewRoom.tsx` |
| 457 | `src/features/interview/JobRecommendationModal.tsx` |
| 447 | `src/services/interview/promptSystem.ts` |
| 416 | `src/features/skill-assessment/components/UploadStep.tsx` |
| 386 | `src/features/dashboard/hooks/useSetupRoom.ts` |
| 378 | `src/components/shared/CloudSyncModal.tsx` |
| 367 | `src/hooks/useInterview.ts` |
| 366 | `src/features/resume-builder/templates/AcademicTemplate.tsx` |

### Appendix B — Scale

| Metric | Value |
|--------|-------|
| TS/TSX files under `src/` | ~200 |
| Approx LOC | ~24.6k |
| Features LOC | ~16.6k |
| Services LOC | ~3.0k |
| Test files | 21 |
| Tests | 90 passed |
| node_modules | ~892 MB |

### Appendix C — Quality gate commands

```bash
npm run typecheck
npm run lint
npm run format:check
npx vitest run
npm run build
npm audit --audit-level=high
```

---

## 11. Summary for stakeholders

**HR-With-AI is feature-rich and recently hardened**, but the **engineering platform under the product is not reliable**: CI points at the wrong branch, the lockfile is ignored, formatting would fail the pipeline, and dependency advisories are numerous.  

Fixing **Phase 0** unlocks everything else. Then **invert the architecture layers**, **break up god screens**, and **grow automated proof** (coverage + E2E). Defer major framework upgrades until the base is green.

**Recommended first action on this branch:** implement Phase 0 PR #1–#2 immediately after plan approval.
