# STATE.md — hr-with-ai

**Last updated:** 2026-09-16
**Synthesized from:** `AGENTS.md` + `TECHNICAL_DEBT_REPORT.md` (superseded) + `docs/IMPROVEMENT_ROADMAP.md` (living) + 3 locked ADRs + 1 Approved SPEC + `.planning/codebase/*` (7 maps)

---

## Current Phase: Phase 0 — Onboarding Complete ✅

**Status:** `PLANNING` — synthesis done; codebase onboarding complete. No active implementation phase; ready to resume from Phase 2/3 forward work (or Phase 5 per roadmap).

**What happened:**
- Ingested 4 classified docs (DOC×3: AGENTS, TECHNICAL_DEBT_REPORT [superseded → archived], IMPROVEMENT_ROADMAP [living]; SPEC×1 Smart Tailor).
- Mapped codebase (ARCHITECTURE, STACK, STRUCTURE, CONCERNS, CONVENTIONS, INTEGRATIONS, TESTING) — 2026-09-16 refresh.
- Validated 3 locked ADRs (000 dependency, 001 state, 002 Dexie) against live code; all hold.
- Generated core planning files: `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md` under `.planning/`.

---

## Progress by Roadmap Phase

| Phase | Title | Status | Evidence (CI/code) |
|-------|-------|--------|---------------------|
| **0** | Platform trust | **✅ Complete** (6/6) | `ci.yml: [master, main]`, `.gitignore` clean lockfile, `format:check` green, `npm audit 0 high/critical`, `VITE_API_URL` unified, coverage artifact in CI |
| **1** | Architecture boundaries | **✅ Complete** (5/5) | `services/ai` + `services/prompts/*`, empty dirs deleted, ADR 000/001/002, `rg services→features` empty |
| **2** | Decompose hotspots | **🟡 Mostly** (4/5 core + 2 partial) | InterviewRoom 458→239, FeedbackView 477→100, JobRec 457→81, useSetupRoom 386→134, CloudSyncModal thin; SectionForms / AIProviderProfilesEditor / ResumeBuilder splits remain |
| **3** | Test & quality gates | **🟡 Mostly** (4/6 core) | Logger + ESLint bans ✅, quiet tests ✅, syncService ~72% ✅, e2e skeleton + CI ✅, thresholds 20% ✅; lift to 50/40% and full 3 smokes pending |
| **4** | Security & data | **✅ Complete** (5/5) | `docs/SECURITY.md`, `api/sync.ts` hardened, secrets policy, ADR 002 + compression tests, privacy UX |
| **5** | Performance & mobile | **⬜ Next** | Code-split audit, Capacitor perf, React 19 deferred |
| **6** | Product finish / scope | **⬜ Planned** | Versioning `0.0.0→0.1.0`, RAG/company-intel decision, Smart Tailor SPEC verification |

**Overall platform signal (roadmap §1):** Typecheck ✅, ESLint ✅, tests 90/90 ⚠️ (thin coverage), Prettier fixed ✅, CI fixed ✅, arch inverted → fixed ⚠️, god files splitting ⚠️.

---

## Active Work & Blockers

- **Active:** None — planning synthesis is the active task. Next implementation should pick from `ROADMAP.md` Phase 2 remaining splits or Phase 3 coverage lift.
- **Blocked:** No hard blockers.
- **Risks carried forward:**
  - `AIProviderProfilesEditor` 771 LOC still a god component (fragile).
  - `ResumeBuilder`/`UploadStep`/`useCVStudio` remaining hotspots.
  - Coverage floor 20% → target 40% overall / 50–60% critical.
  - In-memory rate limit per serverless instance (known limitation, `SECURITY.md`).
  - Dexie 2→13 ladder grows (accepted per ADR 002).

---

## Decisions & Precedence Log

- **Superseded handling:** `TECHNICAL_DEBT_REPORT.md` marked `superseded for planning 2026-07-09 → docs/IMPROVEMENT_ROADMAP.md` is treated as archive. Where they conflict (e.g., debt score 780 vs roadmap diagnosis, React 19 timing, LOC thresholds), **IMPROVEMENT_ROADMAP wins**. Historical ROI numbers ($117k/yr velocity loss) retained only for context.
- **ADR precedence:** Locked ADRs 000/001/002 win over any DOC/SPEC content on same scope (enforced).
- **SPEC precedence:** Smart Tailor Approved SPEC (2026-03-13) wins over DOC mentions of `company-intel` stubs (which are deleted per Phase 1.4).

---

## Next Steps (when resuming implementation)

1. **Pick next PR from ROADMAP:** `EntryListForm` unification + `AIProviderProfilesEditor` split (Phase 2) — highest remaining duplication/god-file risk.
2. **Or:** Coverage lift `20%→50%` for `services/core`/`services/ai`/stores + E2E fixture expansion (Phase 3).
3. **Quality gates for any PR:** `npm run typecheck && npm run lint && npm run format:check && npx vitest run --run && npm run build && npm audit --audit-level=high`.
4. **Do not** start React 19 / tldraw 5 / RAG until Phases 0–3 are green at new thresholds — roadmap non-goals.

---

## Pointers

- **Project identity:** `.planning/PROJECT.md`
- **Features & acceptance:** `.planning/REQUIREMENTS.md`
- **Phased plan + debt swimlane:** `.planning/ROADMAP.md`
- **Living roadmap (source of truth):** `docs/IMPROVEMENT_ROADMAP.md`
- **Security posture:** `docs/SECURITY.md`
- **Codebase maps:** `.planning/codebase/{ARCHITECTURE,STACK,STRUCTURE,CONCERNS,CONVENTIONS,INTEGRATIONS,TESTING}.md`
- **Decisions:** `docs/adr/000-dependency-direction.md`, `001-state-management.md`, `002-dexie-migrations.md`

*Phase 0 onboarding complete — safe to route to next phase planning/execution.*
