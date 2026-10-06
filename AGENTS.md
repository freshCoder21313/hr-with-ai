# Agent Guide for `hr-with-ai`

This repository is a React application built with TypeScript, Vite, Tailwind CSS (v4), and Capacitor for mobile deployment. It functions as an intelligent HR Assistant, featuring resume parsing, mock interviews, and job recommendations.

## 1. Environment & Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS (v4), PostCSS
- **State Management:** Zustand (Global), React Context (Theme/Auth)
- **Database:** Dexie.js (IndexedDB wrapper)
- **Mobile:** Capacitor (Android)
- **Testing:** Vitest, React Testing Library
- **UI Components:** Radix UI primitives, Lucide React icons, Recharts, Mermaid
- **Routing:** React Router v7 (`HashRouter` for mobile compatibility)

## 2. Build, Lint, and Test Commands

### Development & Build
- **Start Dev Server:** `npm run dev` (Port 5173 usually, check output)
- **Production Build:** `npm run build` (Outputs to `dist/`)
- **Preview Build:** `npm run preview`
- **Mobile Sync/Build:** `npm run android` (Builds web assets, syncs, and opens Android Studio)

### Code Quality
- **Type Check:** `npm run typecheck` (Runs `tsc --noEmit` - **CRITICAL**: Run this after major refactors!)
- **Lint:** `npm run lint` (ESLint for .ts/.tsx files)
- **Fix Linting:** `npm run lint:fix`
- **Format:** `npm run format` (Prettier)

### Testing (Vitest)
This project uses **Vitest** with JSDOM environment.
Setup file: `src/setupTests.ts`.

- **Run All Tests:**
  ```bash
  npm run test
  ```
- **Run a Single Test File:**
  ```bash
  npx vitest run src/services/core/syncService.test.ts
  ```
- **Run Tests Matching a Name/Pattern:**
  ```bash
  npx vitest -t "syncService"
  ```
- **Run with Coverage:**
  ```bash
  npm run test:coverage
  ```
- **E2E Smoke (Playwright):**
  ```bash
  npm run test:e2e:install   # once
  npm run test:e2e
  ```
- **Watch Mode:** `npm run test` runs in watch mode by default. Use `run` argument for single pass.
- **Logging:** use `logger` from `@/lib/logger` instead of `console.log` (ESLint forbids `console.log`).

## 3. Code Style & Guidelines

### Imports
**Order:**
1. React and standard libraries
2. Third-party libraries (e.g., `react-router-dom`, `zustand`, `lucide-react`)
3. Internal Core/Shared (`@/lib`, `@/components/ui`, `@/types`, `@/services`)
4. Feature Components (`@/features/...`)
5. Relative imports (siblings)

**Conventions:**
- Use the `@/` alias for all imports from `src/`. Avoid long relative paths like `../../`.
- **Absolute:** `import { Button } from "@/components/ui/button"`
- **Relative:** Only for files in the same feature directory if convenient.

### TypeScript
- **Strictness:** No `any`. Use `unknown` if necessary and narrow types.
- **Component Props:**
  - Define as `interface` (e.g., `interface ButtonProps`).
  - Export interfaces if they are reused.
- **Functional Components:**
  - Use `React.FC<Props>` or directly type the props object: `export const MyComponent = ({ prop }: Props) => { ... }`.
- **Nullability:** Handle `null` and `undefined` explicitly. Optional chaining (`?.`) is encouraged.
- **Central Types:** check `src/types/index.ts` and `src/types/resume.ts` for core domain entities (Interview, Resume, UserSettings).

### Naming Conventions
- **Files/Directories:**
  - Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
  - Hooks/Utils: `camelCase.ts` (e.g., `useAuth.ts`, `dateUtils.ts`)
- **Variables/Functions:** `camelCase`
- **Component Names:** `PascalCase`
- **Constants:** `UPPER_CASE` for global constants.
- **Types/Interfaces:** `PascalCase` (e.g., `User`, `AuthResponse`)

### Styling & Design Tokens (Tailwind CSS)
- Use standard utility classes.
- **Conditional Classes:** Use `cn()` from `@/lib/utils` (merges `clsx` and `tailwind-merge`).
  ```tsx
  <div className={cn("flex p-4", isActive && "bg-primary text-primary-foreground", className)} />
  ```
- **Semantic Colors:** STRICTLY use CSS variables defined in `index.css` / Tailwind config (`bg-primary`, `bg-card`, `bg-muted`, `bg-success/10`, `text-success`, `bg-warning/10`, `text-warning`, `bg-info/10`, `text-info`, `bg-destructive`, `text-destructive`).
- **No Hardcoded Raw Colors:** Avoid arbitrary palette colors like `bg-purple-600`, `bg-emerald-700`, `bg-amber-500` for standard UI elements.
- **Dark Mode Contrast:** Elevated surfaces (sheets, dialogs, cards) must specify `border-border` and surface tokens. Never use unstyled raw borders that cause bright white lines in Dark Mode. In alerts, pair `bg-<token>/10` with `text-<token>`.
- Avoid inline `style={{ ... }}` unless dynamic values (coordinates, user colors) require it.
- **Full Guide:** see `docs/UI_UX_AND_FEATURE_GUIDELINES.md` and `docs/adr/004-ui-ux-design-system-and-feature-rules.md`.

### Navigation & Modals
- **No Dead Routes:** Ensure all routes exist or redirect cleanly (e.g. `<Route path="/cv-chat" element={<Navigate to="/studio" replace />} />`).
- **History Navigation:** Back buttons should check `window.history.length > 1 ? navigate(-1) : navigate(fallback)` and have accurate labels ("Back to Home" for `/`, "Back to CV Studio" for `/studio`).
- **No Modal Flashing:** Never close Modal A and use `setTimeout` to open Modal B. Consolidate into unified tabbed dialogs (e.g. `SettingsModal`).
- **Wired Triggers:** Never render modals without discoverable UI trigger buttons.
- **Information Architecture & Tabs:** Keep top-level tabs for distinct high-level domains (e.g., Performance, Coaching, Transcript). Split complex multi-dimensional analytics into intuitive sub-tabs (`bilingual`, `grammar`, `fluency`).
- **Comparative Cards & Quotes:** Before/after comparisons must pair the original statement (italic quotes) with an executive upgrade (STAR breakdown). Always escape JSX quotes (`&ldquo;...&rdquo;`).

### Feature Development & Data Persistence
- **Offline-First Persistence:** User outcomes, scores, and records (interviews, tailored CVs, quiz scores, career facts, coaching reports) MUST be persisted in IndexedDB via Dexie (`src/lib/db.ts`). No ephemeral session loss upon reload.
- **Dexie Migrations:** Every schema addition must increment `this.version(N).stores({...})` according to `docs/adr/002-dexie-migrations.md`.
- **Management Parity:** Created records must have viewing, search/filter, and deletion capabilities (with confirmation dialog) in History/Studio.
- **Defensive Input Validation:** Freeform user inputs driving AI generation (custom languages, arbitrary roles, keywords) must be validated client-side first (rejecting empty/numbers/symbols, minimum length) with quick-pick chips and real-time visual feedback.

### State Management
- **Local UI State:** `useState` for component-specific state (modals, tabs, ephemeral form UI).
- **Global App State:** `zustand` stores colocated with features (`src/features/*/stores` or `*Store.ts`) for cross-route domain state.
- **Data Persistence:** `dexie` for storing large datasets/offline data in IndexedDB (source of truth for interviews/resumes/settings).
- **Policy:** see `docs/adr/001-state-management.md`.

### Error Handling
- **Async Operations:** Wrap `await` calls in `try/catch`.
- **UI Feedback:** Display user-friendly error messages (toasts, alerts) rather than just logging.
- **Destructive Confirmations:** Prompt user confirmation via `notificationService.confirm` before deleting items.
- **Logging:** Use `logger` from `@/lib/logger` (ESLint strictly forbids `console.log`). Use `console.error` only for unexpected failures.

## 4. Project Structure

- **`src/api/`**: Serverless functions / Backend logic (also `api/` at repo root for Vercel).
- **`src/components/ui/`**: Reusable "shadcn-like" base components (Buttons, Inputs, Dialogs).
- **`src/features/`**: Feature-based UI modules (pages, hooks, stores). **Must not be imported by `services/`.**
- **`src/lib/`**: Shared utilities, database configuration.
- **`src/services/`**: Domain & infrastructure services (AI, sync, interview, resume, jobs, voice, prompts).
  - **`src/services/ai/`**: `AIService`, provider strategies, schemas, config helpers.
  - **`src/services/prompts/`**: Domain-split prompt templates (interview, resume, jobs, …).
- **`src/types/`**: Global type definitions (`src/types/index.ts`, `src/types/resume.ts`).

### Dependency direction (strict)

```
features (UI) → services → lib / types
```

See `docs/adr/000-dependency-direction.md`.

## 5. Agent Operational Guidelines

When operating in this codebase, adhere to the following workflow:

1.  **Explore Phase:**
    - Read `AGENTS.md` (this file).
    - Read `src/types/index.ts` to understand domain models.
    - Read `src/lib/db.ts` to understand data persistence.
    - Search for existing components before creating new ones.

2.  **Plan Phase:**
    - Propose a clear plan.
    - Identify necessary changes in `types`, `components`, and `stores`.

3.  **Implementation Phase:**
    - Use `localApiPlugin` logic for mocking if backend is involved.
    - **Mobile Awareness:** Avoid APIs that don't work in a WebView (e.g., `fs` without Capacitor plugins).
    - **No Hallucinated Libraries:** Do not install new packages unless explicitly requested.

4.  **Verification Phase:**
    - Run `npm run typecheck` after any TypeScript changes.
    - Run `npm run lint` to ensure style consistency.
    - Run related tests with `npx vitest run ...`.

## 6. Specific Patterns

### API & Data Fetching
- **Client env:** only `VITE_*` (e.g. `import.meta.env.VITE_API_URL`). See `.env.example`.
- **Server env:** `DATABASE_URL`, `ALLOWED_ORIGIN`, `RATE_LIMIT` for `api/sync.ts` — never expose with `VITE_`.
- **AI API keys:** never hardcode. Prefer in-app Settings / `ApiKeyModal` (local storage), not client env.
- **Security:** see `docs/SECURITY.md` (sync threat model, vuln exceptions, secrets policy).

### Routing
- **Library:** `react-router-dom` v7.
- **Router:** `HashRouter` is used (compatible with Capacitor/file-system based routing).
- **Links:** Use `<Link>` or `useNavigate`. Do not use `<a>` tags for internal navigation.

### AI Integration
- This app uses multiple AI providers (Gemini, OpenAI, Anthropic, OpenRouter).
- Import from `src/services/ai/` (`AIService`, strategies, schemas). Prefer `@/services/ai` over deprecated `features/ai-provider` shims.
- Prompts: `@/services/prompts` (or legacy re-export `@/services/interview/promptSystem`).
- Respect `src/types/index.ts` regarding `AIProviderStrategy`, `InterviewContentType`, and `InterviewInteractionMode`.
- **Graceful Recognition & Fallbacks:** For freeform user parameters, schemas must include recognition flags (`isTargetLanguageRecognized: z.boolean()`) and prompts must specify deterministic fallback behavior (e.g. English) when given gibberish, paired with an actionable UI warning banner.

(End of Guide)
