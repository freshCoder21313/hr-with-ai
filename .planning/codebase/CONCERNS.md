# Codebase Concerns

**Analysis Date:** 2026-09-16

## Tech Debt

**God Component: AIProviderProfilesEditor:**
- Issue: Enormous file (771 lines) handling profile management, API testing, model fetching, and fallback orchestration.
- Files: `src/components/shared/AIProviderProfilesEditor.tsx`
- Impact: Extremely difficult to maintain or extend. Testing connections logic is tightly coupled with UI.
- Fix approach: Split into `ProfileList`, `ProfileEditor`, and `FallbackSettings`. Extract logic to `useAIProviderSettings` hook.

**God Component: ResumeBuilder:**
- Issue: Large component (552 lines) mixing layout, multiple sub-forms, tour configuration, and print logic.
- Files: `src/features/resume-builder/ResumeBuilder.tsx`
- Impact: High cognitive load for developers; performance risks during re-renders.
- Fix approach: Extract `BuilderHeader`, `BuilderTabs`, and `TourManager` into separate components.

**Duplicated Logic in SectionForms:**
- Issue: `handleAnalyze` function and state management for AI critique are repeated across multiple form files.
- Files: `src/features/resume-builder/SectionForms/WorkForm.tsx`, `src/features/resume-builder/SectionForms/EducationForm.tsx`, `src/features/resume-builder/SectionForms/ProjectsForm.tsx`, `src/features/resume-builder/SectionForms/SkillsForm.tsx`
- Impact: Inconsistent AI feedback behavior and multiplied maintenance effort.
- Fix approach: Extract logic into a `useSectionAnalysis` hook.

**TypeScript "any" Usage:**
- Issue: 82 instances of `: any` or `as any` still present, particularly in AI strategies and data parsing.
- Files: `src/services/ai/strategies/google-gemini.ts`, `src/services/core/syncService.ts`, `src/features/resume-builder/ResumeBuilder.tsx`
- Impact: Reduces type safety and hides potential runtime crashes in critical AI integration paths.
- Fix approach: Replace `any` with `unknown` and implement proper type guards or Zod schemas.

## Known Bugs

**Flaky Feature Tests:**
- Symptoms: `act(...)` warnings and intermittent failures.
- Files: `src/features/cv-studio/hooks/useCVStudio.test.ts`
- Trigger: Occurs during async state updates and AI mock responses.
- Workaround: Increase test timeouts or wrap updates in `await waitFor()`.

## Security Considerations

**Manual Sensitive Key Blacklist:**
- Risk: `syncService` uses a hardcoded list to strip secrets. New settings fields may accidentally leak secrets to cloud sync.
- Files: `src/services/core/syncService.ts`
- Current mitigation: Manual exclusion list in `exportData`.
- Recommendations: Implement a dedicated `Secret` type or decorator to mark fields for automatic exclusion during serialization.

**Local Storage of API Keys:**
- Risk: AI provider keys are stored in IndexedDB/LocalStorage.
- Files: `src/lib/db.ts`, `src/services/ai/aiConfigService.ts`
- Current mitigation: Stripping keys during sync.
- Recommendations: Consider using an obscured storage or prompting for keys per session for high-security environments.

## Performance Bottlenecks

**Large Component Re-renders:**
- Problem: Changes to a single form field in `ResumeBuilder` can trigger re-renders of the entire preview and sidebar.
- Files: `src/features/resume-builder/ResumeBuilder.tsx`, `src/features/resume-builder/ResumePreview.tsx`
- Cause: Tightly coupled state in `useResumeBuilder`.
- Improvement path: Use `React.memo` for preview components and split store state to minimize subscribers.

## Fragile Areas

**Voice Interview Orchestration:**
- Files: `src/features/interview/hooks/useVoiceInterview.ts`
- Why fragile: Highly complex coordination of STT, TTS, Audio Recording, and AI streaming. Small changes often break the feedback loop or cause audio overlaps.
- Safe modification: Must be verified with real device testing (Capacitor/Android).
- Test coverage: Low (23.7% in voice services).

## Scaling Limits

**IndexedDB Storage Size:**
- Current capacity: Browser-dependent (usually 50MB+).
- Limit: Performance degrades significantly when fetching thousands of large resume/interview objects.
- Scaling path: Implement pagination for History and Resume lists; move old data to an archive table.

## Dependencies at Risk

**Lagging Core Frameworks:**
- Risk: 24+ outdated packages, including React 18 (vs 19) and Vite 6 (vs 8).
- Impact: Missing performance optimizations, modern hooks (`use`), and potential security vulnerabilities in older versions.
- Migration plan: Incremental upgrade starting with Vite and build tools, followed by React.

## Test Coverage Gaps

**Feature/UI Logic:**
- What's not tested: Almost all feature components and hooks.
- Files: `src/features/**/*` (only 10 test files for 114 source files).
- Risk: Regressions in UI behavior, navigation, and form validation go unnoticed.
- Priority: High

**AI Provider Strategies:**
- What's not tested: Complex prompt construction and response parsing for various providers.
- Files: `src/services/ai/strategies/*.ts` (3.2% coverage).
- Risk: Changes in AI provider APIs or prompt templates break core app functionality.
- Priority: High

---

*Concerns audit: 2026-09-16*
