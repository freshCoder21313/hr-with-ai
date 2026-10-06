# ADR 004: UI/UX Design System, Token Standardization, and Feature Quality Rules

- **Status:** Accepted
- **Date:** 2026-10-06
- **Context:** `hr-with-ai` frontend development, theme consistency, and feature lifecycle standards.

---

## Context

As `hr-with-ai` expanded across multiple domains (Interview Simulator, CV Studio, Resume Builder, Career Knowledge Vault, Skill Assessment, Cloud Sync), several UI/UX and architectural inconsistencies arose:
1. Hardcoded colors (`emerald-700`, `purple-600`, `amber-500`) causing jarring visual discordance and unreadable contrast in Dark Mode.
2. Unstyled default borders producing bright white lines against `slate-950` dark backgrounds due to Tailwind v4 default border-color behavior.
3. Chained modals with `setTimeout` hacks creating visual flashing and accessibility degradation.
4. Ephemeral features (e.g. Skill Assessment) lacking persistence, resulting in immediate user data loss on reload.
5. Misleading navigation labels and dead routes (e.g., `/cv-chat`).

---

## Decision

1. **Design Token Standardization**:
   - Strictly require semantic design tokens (`primary`, `card`, `muted`, `success`, `warning`, `info`, `destructive`) over raw palette classes.
   - Enforce global border reset in `src/index.css` (`*, ::before, ::after { border-color: hsl(var(--border)); }`) and explicit `border-border` on all elevated surfaces (sheets, dialogs, drawers).
   - Require high-contrast semantic text tokens (`text-success`, `text-warning`, `text-info`, `text-destructive`) in combination with `/10` or `/20` background tinting.

2. **Modal & Navigation Quality**:
   - Forbid modal swapping via `setTimeout`. Consolidate related configuration screens into tabbed dialogs (e.g., `SettingsModal` integrating AI Provider Profiles).
   - Ensure all modal states are tied to accessible UI triggers.
   - Provide fallback-aware history navigation and maintain permanent redirects for deprecated route paths.

3. **Feature Development (Feat) Quality Standards**:
   - Enforce offline-first IndexedDB persistence for all user-generated assets and assessments using Dexie version migrations.
   - Mandate management parity (search/filter, review, deletion with confirmation) in History or Studio views.
   - Require full pass of verification gates (`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`) before considering a feature done.

4. **Defensive AI Input Handling & Fallbacks**:
   - Freeform user inputs (custom language, arbitrary keywords, parameters) must undergo client-side validation before triggering AI calls to prevent token waste on garbage/symbols.
   - Structured AI schemas must include recognition flags (`isTargetLanguageRecognized`). Prompts must specify deterministic fallback behavior (e.g. defaulting to English) rather than failing validation.
   - UI must display clear, actionable warning banners with re-selection CTAs when fallback is triggered.

5. **Information Architecture & Analytical Sub-Tabs**:
   - Reserve top-level tabs for distinct major functional domains (e.g. Performance Analysis, Language & Delivery Coach, Full Transcript).
   - Divide deep analytical features into intuitive sub-tabs (Bilingual Transformation, Grammar & Word Choice, Delivery & Fluency) rather than monolithic vertical scrolling.
   - Use structured comparative cards (Original vs. Executive STAR Upgrade) with strict typography escaping (`&ldquo;...&rdquo;`).

---

## Consequences

- **Positive:**
  - Complete visual harmony across Light and Dark themes with zero border contrast glitches.
  - Consistent and predictable UX across all feature modules.
  - Elimination of data loss bugs through persistent offline-first storage.
  - Clear, enforceable code and design standards documented for contributors and AI agents.
- **Maintenance:**
  - Developers and agents must review [UI_UX_AND_FEATURE_GUIDELINES.md](../UI_UX_AND_FEATURE_GUIDELINES.md) before implementing new views.
