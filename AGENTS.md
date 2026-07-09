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
- **Watch Mode:** `npm run test` runs in watch mode by default. Use `run` argument for single pass.

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

### Styling (Tailwind CSS)
- Use standard utility classes.
- **Conditional Classes:** Use `cn()` from `@/lib/utils` (merges `clsx` and `tailwind-merge`).
  ```tsx
  <div className={cn("flex p-4", isActive && "bg-blue-500", className)} />
  ```
- **Colors:** Use CSS variables defined in `index.css` / tailwind config (e.g., `bg-primary`, `text-muted-foreground`).
- Avoid inline `style={{ ... }}` unless dynamic values (coordinates, user colors) require it.

### State Management
- **Local UI State:** `useState` for component-specific state (modals, tabs, ephemeral form UI).
- **Global App State:** `zustand` stores colocated with features (`src/features/*/stores` or `*Store.ts`) for cross-route domain state.
- **Data Persistence:** `dexie` for storing large datasets/offline data in IndexedDB (source of truth for interviews/resumes/settings).
- **Policy:** see `docs/adr/001-state-management.md`.

### Error Handling
- **Async Operations:** Wrap `await` calls in `try/catch`.
- **UI Feedback:** Display user-friendly error messages (toasts, alerts) rather than just logging.
- **Logging:** Use `console.error` for debugging unexpected failures.

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

### Routing
- **Library:** `react-router-dom` v7.
- **Router:** `HashRouter` is used (compatible with Capacitor/file-system based routing).
- **Links:** Use `<Link>` or `useNavigate`. Do not use `<a>` tags for internal navigation.

### AI Integration
- This app uses multiple AI providers (Gemini, OpenAI, Anthropic, OpenRouter).
- Import from `src/services/ai/` (`AIService`, strategies, schemas). Prefer `@/services/ai` over deprecated `features/ai-provider` shims.
- Prompts: `@/services/prompts` (or legacy re-export `@/services/interview/promptSystem`).
- Respect `src/types/index.ts` regarding `AIProviderStrategy`, `InterviewContentType`, and `InterviewInteractionMode`.

(End of Guide)
