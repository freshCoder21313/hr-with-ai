# UI/UX & Feature Development Guidelines (`hr-with-ai`)

This document defines the core design system principles, token standards, interaction patterns, and feature lifecycle requirements for `hr-with-ai`. All new features, components, and refactors MUST comply with these rules.

---

## 1. Design System & Token Principles

The application uses Tailwind CSS (v4) with CSS variables defined in `src/index.css` supporting both **Light** and **Dark** themes.

### 1.1. Semantic Color Tokens
Always use semantic tokens rather than raw, hardcoded palette utilities (e.g., avoid `bg-purple-600`, `bg-emerald-700`, `bg-amber-500`):

| Purpose | Semantic Background Token | Semantic Text / Icon Token | Border Token |
| :--- | :--- | :--- | :--- |
| **Default / Primary Action** | `bg-primary text-primary-foreground` | `text-primary` | `border-primary` |
| **Card / Surface** | `bg-card text-card-foreground` | `text-card-foreground` | `border-border` |
| **Muted Surface / Subtext**| `bg-muted text-muted-foreground` | `text-muted-foreground` | `border-border` |
| **Success / Passed** | `bg-success/10` or `bg-success` | `text-success` | `border-success/30` |
| **Warning / Attention / In-progress** | `bg-warning/10` | `text-warning` | `border-warning/30` |
| **Info / Informational** | `bg-info/10` | `text-info` | `border-info/30` |
| **Destructive / Error / Fail** | `bg-destructive/10` or `bg-destructive` | `text-destructive` | `border-destructive/30` |

### 1.2. Dark Mode Contrast & Border Standards
- **Universal Border Reset**: `src/index.css` sets all elements to default to `hsl(var(--border))`. Never override borders with arbitrary light gray colors like `border-gray-200` or `border-white`.
- **Containers & Drawers**: Modals, Dialogs, Drawers, Sheets, and Cards must explicitly specify `border-border` and surface colors (`bg-card` or `bg-background`).
- **Text Readability in Alerts / Callouts**: Never combine dark text classes (such as `text-emerald-900` or `text-amber-900`) with semi-transparent backgrounds (`bg-emerald-500/10`), as this renders text unreadable in dark mode. Always use `text-success`, `text-warning`, `text-info`, or `text-destructive`.

---

## 2. Navigation & Routing Rules

1. **No Dead Routes**:
   - Any legacy, shortened, or deprecated routes (e.g. `/cv-chat`) must be permanently redirected in `src/App.tsx` (e.g. `<Route path="/cv-chat" element={<Navigate to="/studio" replace />} />`).
2. **Predictable Back Navigation**:
   - Back buttons in sub-views (such as Resume Builder or Assessment) should check browser history before falling back:
     ```tsx
     const handleBack = () => {
       if (window.history.length > 1) {
         navigate(-1);
       } else {
         navigate('/studio');
       }
     };
     ```
   - Never hardcode back buttons to dead ends or unrelated setup flows.
3. **Accurate Action Labels**:
   - If a button navigates to `/` (Landing/Home page), the label must be **"Back to Home"**, NOT **"Back to Dashboard"**.
   - If navigating to CV Studio, label as **"Back to CV Studio"**.
4. **External Links**:
   - External links (e.g. job URLs, portfolio links) must always specify `target="_blank" rel="noopener noreferrer"` and display an external link indicator icon (`ExternalLink` from `lucide-react`).

---

## 3. Modals, Drawers & User Interaction (UX)

1. **No Modal Flashing / Chaining**:
   - **Prohibited**: Closing Modal A via `onOpenChange(false)` and running a `setTimeout(..., 100)` to open Modal B. This creates disorienting UI flashing and breaks focus management.
   - **Required**: Consolidate multi-step or related settings into unified `Tabs` inside a single dialog (e.g., `SettingsModal` contains both "General" and "AI Providers" tabs).
2. **Wired Action Triggers**:
   - Never leave modal states unwired without a trigger button. If a feature exists (e.g., `GitHubImportModal`), an accessible, clearly labeled button must exist in the UI header, toolbar, or empty state.
3. **Destructive Action Confirmations**:
   - All destructive actions (deleting interviews, clearing resumes, deleting career facts) MUST prompt user confirmation via `notificationService.confirm({ title, message, variant: 'destructive' })`.
4. **Loading & Disabled States**:
   - During async operations (AI generation, cloud backup, PDF export), buttons must show a spinning loader (`Loader2 className="animate-spin"`) and be disabled to prevent duplicate submissions.

---

## 4. Feature Development (Feat) Rules

When adding any new feature, workflow, or capability, adhere to these mandatory criteria:

### 4.1. Offline-First Persistence (Dexie / IndexedDB)
- **Zero Ephemeral Loss**: Any assessment result, interview session, generated resume, or candidate fact MUST be saved to IndexedDB (`src/lib/db.ts`). Refreshing the browser or navigating away must not destroy user data.
- **Strict Migration Policy**: Every database schema addition must increment `this.version(N).stores({...})` without altering previous version definitions (per [002-dexie-migrations.md](file:///run/media/tr3cyos/SantaSSD/SKS/Sources/repos/aistudio/hr-with-ai/docs/adr/002-dexie-migrations.md)).

### 4.2. Management Parity (History / CRUD)
- If a record is created (e.g. `SkillAssessmentRecord`), the user must have a dedicated view to inspect past records (e.g. `/history` tab), search/filter by keyword/score, and delete unwanted entries.

### 4.3. Empty States & Error Boundaries
- Every list, tab, and search result must have a polished empty state including:
  - An illustrative icon (from `lucide-react`).
  - Clear heading and explanation of why it is empty.
  - A primary call-to-action button guiding the user to create their first item.

### 4.4. Guided Tour (Joyride) Compatibility
- Any UI element referenced in onboarding tours (such as `ResumeBuilder.tsx`) must maintain stable selectors (e.g. `#export-button`, `#preview-tab`) and guard against crashing in non-browser or test environments.

### 4.5. Quality & Verification Gates
Before marking any feature as complete:
1. `npm run typecheck` (`tsc --noEmit`) must succeed with 0 errors.
2. `npm run lint` must pass with 0 errors (remember: `console.log` is forbidden; use `@/lib/logger`).
3. Unit and integration tests must be created and pass:
   ```bash
   npm run test
   ```
4. Production build must succeed:
   ```bash
   npm run build
   ```
