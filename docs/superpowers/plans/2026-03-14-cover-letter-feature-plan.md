# Integrated Cover Letter Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** To build a new, integrated workflow for tailoring CVs and generating cover letters for specific job applications.

**Architecture:** A new unified "Interview Room" page will be created with a two-column layout (vertical nav + content). It will use a single, combined prompt to simultaneously tailor a CV and generate a cover letter, storing the result in a new database table.

**Tech Stack:** React, TypeScript, Vite, Zustand, Dexie.js, Tailwind CSS

---

## Chunk 1: Database and Data Services

### Task 1: Update Database Schema

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Define the `CoverLetter` type.**
  In `src/types.ts`, add the new interface.
  ```typescript
  // In src/types.ts, after the ResumeAnalysis interface
  export interface CoverLetter {
    id?: number;
    interviewId: number;
    content: string;
    createdAt: number;
    updatedAt: number;
  }
  ```

- [ ] **Step 2: Add the `cover_letters` table to Dexie.**
  In `src/lib/db.ts`, add `cover_letters` to the class properties and the latest schema version.
  ```typescript
  // In src/lib/db.ts
  class HRDatabase extends Dexie {
    // ... existing tables
    cover_letters!: Table<CoverLetter, number>;

    constructor() {
      // ...
      // Inside the latest .version() call
      this.version(14).stores({
        // ... existing stores
        cover_letters: '++id, interviewId, createdAt, updatedAt',
      });

      // Add hooks for cover_letters
      this.cover_letters.hook('creating', (_primKey, obj) => {
        obj.updatedAt = Date.now();
        if (!obj.createdAt) obj.createdAt = Date.now();
      });
      this.cover_letters.hook('updating', (_mods, _primKey, _obj, _trans) => {
        return { updatedAt: Date.now() };
      });
    }
    // ...
  }
  ```

- [ ] **Step 3: Run typecheck to ensure schema is valid.**
  Run: `npm run typecheck`
  Expected: PASS with no errors related to the new type or DB schema.

- [ ] **Step 4: Commit database changes.**
  ```bash
  git add src/types.ts src/lib/db.ts
  git commit -m "feat(data): add CoverLetter type and db table"
  ```

---

## Chunk 2: UI Scaffolding

### Task 2: Create the Unified Interview Room Page

**Files:**
- Create: `src/features/interview-room/InterviewRoomPage.tsx`
- Create: `src/features/interview-room/components/VerticalNavBar.tsx`
- Modify: `src/App.tsx` (or your main router file)

- [ ] **Step 1: Write the failing test for the main page.**
  Create `src/features/interview-room/InterviewRoomPage.test.tsx`:
  ```tsx
  import { render, screen } from '@testing-library/react';
  import { InterviewRoomPage } from './InterviewRoomPage';
  import { MemoryRouter } from 'react-router-dom';

  describe('InterviewRoomPage', () => {
    it('renders the vertical navigation and a content area', () => {
      render(<MemoryRouter><InterviewRoomPage /></MemoryRouter>);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run test to see it fail.**
  Run: `npx vitest run src/features/interview-room/InterviewRoomPage.test.tsx`
  Expected: FAIL (component not created).

- [ ] **Step 3: Create the `VerticalNavBar.tsx` component.**
  ```tsx
  // src/features/interview-room/components/VerticalNavBar.tsx
  import React from 'react';

  export const VerticalNavBar = () => {
    return (
      <nav aria-label="Interview Room Navigation">
        <ul>
          <li><a href="#">CV Chat</a></li>
          <li><a href="#">CV & Cover Letter Tailoring</a></li>
          <li><a href="#">Analytics</a></li>
        </ul>
      </nav>
    );
  };
  ```

- [ ] **Step 4: Create the `InterviewRoomPage.tsx` component.**
  ```tsx
  // src/features/interview-room/InterviewRoomPage.tsx
  import React from 'react';
  import { VerticalNavBar } from './components/VerticalNavBar';

  export const InterviewRoomPage = () => {
    return (
      <div className="flex h-screen">
        <aside className="w-1/4 bg-gray-100 p-4">
          <VerticalNavBar />
        </aside>
        <main role="main" className="w-3/4 p-4">
          <h1>Interview Room Content</h1>
        </main>
      </div>
    );
  };
  ```

- [ ] **Step 5: Run the test again to verify it passes.**
  Run: `npx vitest run src/features/interview-room/InterviewRoomPage.test.tsx`
  Expected: PASS.

- [ ] **Step 6: Add a route for the new page.**
  In `src/App.tsx` or your router setup, add a route for `/interview-room/:id`.
  ```tsx
  // Example for App.tsx with react-router
  import { InterviewRoomPage } from '@/features/interview-room/InterviewRoomPage';
  // ...
  <Route path="/interview-room/:id" element={<InterviewRoomPage />} />
  ```

- [ ] **Step 7: Commit the UI scaffold.**
  ```bash
  git add src/features/interview-room/ src/App.tsx
  git commit -m "feat(ui): scaffold unified InterviewRoomPage and vertical nav"
  ```

---

## Chunk 3: UI Implementation

### Task 3: Implement the `CV & Cover Letter Tailoring` View

**Files:**
- Create: `src/features/interview-room/components/TailoringView.tsx`
- Modify: `src/features/interview-room/InterviewRoomPage.tsx`

- [ ] **Step 1: Write the failing test for the Tailoring View.**
  Create `src/features/interview-room/components/TailoringView.test.tsx`:
  ```tsx
  import { render, screen } from '@testing-library/react';
  import { TailoringView } from './TailoringView';

  describe('TailoringView', () => {
    it('renders the core elements for tailoring', () => {
      render(<TailoringView />);
      expect(screen.getByLabelText(/custom prompt/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cover letter style/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tailor cv & generate cover letter/i })).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run the test to see it fail.**
  Run: `npx vitest run src/features/interview-room/components/TailoringView.test.tsx`
  Expected: FAIL (component not created).

- [ ] **Step 3: Create the `TailoringView.tsx` component.**
  ```tsx
  // src/features/interview-room/components/TailoringView.tsx
  import React from 'react';
  import { Label } from '@/components/ui/label';
  import { Textarea } from '@/components/ui/textarea';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { Button } from '@/components/ui/button';

  export const TailoringView = () => {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="custom-prompt">Custom Prompt</Label>
          <Textarea id="custom-prompt" placeholder="Tell the AI how to tailor your CV and what to write in the cover letter..." />
        </div>
        <div>
          <Label htmlFor="cl-style">Cover Letter Style</Label>
          <Select>
            <SelectTrigger id="cl-style">
              <SelectValue placeholder="Select a style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="modern">Professional & Modern</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button>Tailor CV & Generate Cover Letter</Button>
      </div>
    );
  };
  ```

- [ ] **Step 4: Fix accessibility labels in the component.**
  The test is looking for labels. Let's add `aria-labelledby` to the controls to link them properly.
  *   Modify the `Textarea` to have an `aria-label` or connect it via `id`. The `htmlFor` on `Label` should work if the `id` matches.
  *   The test will fail on the `Select` because the label is not associated. Let's wrap it.
  *   The test will fail on the `Button` name.

  Let's refine the component and test to be more accessible and testable.
  *The plan shows the final version after this step.*
  ```tsx
  // src/features/interview-room/components/TailoringView.tsx (Revised)
  // ... imports
  export const TailoringView = () => {
    return (
      <div className="space-y-4">
        <div className="grid w-full gap-1.5">
          <Label htmlFor="custom-prompt">Custom Prompt</Label>
          <Textarea id="custom-prompt" placeholder="Tell the AI..." />
        </div>
        <div className="grid w-full gap-1.5">
          <Label id="cl-style-label">Cover Letter Style</Label>
          <Select>
            <SelectTrigger aria-labelledby="cl-style-label">
              <SelectValue placeholder="Select a style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="modern">Professional & Modern</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button>Tailor CV & Generate Cover Letter</Button>
      </div>
    );
  ```
  And update the test to find the controls correctly.
  ```tsx
  // src/features/interview-room/components/TailoringView.test.tsx (Revised)
  // ...
  it('renders the core elements for tailoring', () => {
    render(<TailoringView />);
    expect(screen.getByLabelText(/custom prompt/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cover letter style/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tailor cv & generate cover letter/i })).toBeInTheDocument();
  });
  ```
  This is a better approach.

- [ ] **Step 5: Run test to see it pass.**
  Run: `npx vitest run src/features/interview-room/components/TailoringView.test.tsx`
  Expected: PASS.

- [ ] **Step 6: Integrate `TailoringView` into the main page.**
  Modify `src/features/interview-room/InterviewRoomPage.tsx` to show the view.
  ```tsx
  //...
  import { TailoringView } from './components/TailoringView';
  // ...
  // Inside the main role="main" element
  <main role="main" className="w-3/4 p-4">
    {/* This will later be controlled by the VerticalNav state */}
    <TailoringView />
  </main>
  //...
  ```

- [ ] **Step 7: Commit the `TailoringView` component.**
  ```bash
  git add src/features/interview-room/
  git commit -m "feat(ui): implement initial TailoringView component"
  ```

### Task 4: Implement Rich Text Editor

**Files:**
- Modify: `src/features/interview-room/components/TailoringView.tsx`

- [ ] **Step 1: Add a rich text editor component.**
  We'll use a simple `contentEditable` div for now to avoid new dependencies. A proper library like Tiptap/Lexical would be a future improvement.
  ```tsx
  // In TailoringView.tsx
  //...
  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left column for controls */}
      <div className="space-y-4">
        {/* ... prompt and select controls ... */}
        <Button>Tailor CV & Generate Cover Letter</Button>
      </div>

      {/* Right column for outputs */}
      <div className="space-y-4">
        <div className="h-full rounded-md border bg-muted p-4">
          <h3 className="text-lg font-semibold mb-2">Generated Cover Letter</h3>
          <div
            aria-label="Generated Cover Letter"
            role="textbox"
            contentEditable
            className="prose prose-sm max-w-none h-96 overflow-y-auto"
          />
        </div>
      </div>
    </div>
  )
  ```
  *Note: The overall layout is changed to two columns here to accommodate the editor.*

- [ ] **Step 2: Verify the editor is rendered.**
  Add a test to `TailoringView.test.tsx`:
  ```tsx
  it('renders a textbox for the generated cover letter', () => {
    render(<TailoringView />);
    expect(screen.getByRole('textbox', { name: /generated cover letter/i })).toBeInTheDocument();
  });
  ```
  Run the test to ensure it passes. `npx vitest run src/features/interview-room/components/TailoringView.test.tsx`

- [ ] **Step 3: Commit the rich text editor addition.**
  ```bash
  git add src/features/interview-room/components/TailoringView.tsx
  git commit -m "feat(ui): add basic rich text editor to TailoringView"
  ```

---

## Chunk 4: AI & State Integration

### Task 5: Implement AI Generation Logic

**Files:**
- Create: `src/services/ai/coverLetterService.ts`
- Modify: `src/services/ai/AIProviderFactory.ts` (or equivalent)

- [ ] **Step 1: Write the failing test for the AI service.**
  Create `src/services/ai/coverLetterService.test.ts`:
  ```tsx
  import { generateTailoredContent } from './coverLetterService';
  import { vi } from 'vitest';

  // Mock the AI Provider
  const mockGenerateText = vi.fn();
  vi.mock('@/services/ai/AIProviderFactory', () => ({
    getAIProvider: () => ({
      generateText: mockGenerateText,
    }),
  }));

  describe('generateTailoredContent', () => {
    it('should call the AI provider with a combined prompt', async () => {
      mockGenerateText.mockResolvedValue({ text: '{"cv": "...", "coverLetter": "..."}' });
      const result = await generateTailoredContent({
        jobDescription: 'A job.',
        cv: 'My CV.',
        prompt: 'Make it good.',
        style: 'formal'
      });
      expect(mockGenerateText).toHaveBeenCalled();
      expect(result).toHaveProperty('cv');
      expect(result).toHaveProperty('coverLetter');
    });
  });
  ```

- [ ] **Step 2: Run test to see it fail.**
  Run: `npx vitest run src/services/ai/coverLetterService.test.tsx`
  Expected: FAIL (function not defined).

- [ ] **Step 3: Create the `coverLetterService.ts` file.**
  ```ts
  // src/services/ai/coverLetterService.ts
  import { getAIProvider } from './AIProviderFactory'; // Assuming this exists

  interface TailorParams {
    jobDescription: string;
    cv: string;
    prompt: string;
    style: string;
  }

  export async function generateTailoredContent(params: TailorParams): Promise<{ cv: string; coverLetter: string }> {
    const aiProvider = getAIProvider(); // Gets the configured provider (e.g., Gemini)

    const systemInstruction = `You are an expert HR assistant. Your task is to both tailor a CV and write a cover letter based on a job description and user instructions.
    - Tailor the CV to highlight the most relevant skills and experiences.
    - Write a cover letter in a ${params.style} tone.
    - The user's custom instructions are: "${params.prompt}".
    - The original CV is: "${params.cv}".
    - The target job description is: "${params.jobDescription}".
    You MUST return a single JSON object with two keys: "cv" and "coverLetter".`;

    const response = await aiProvider.generateText(
      [{ role: 'system', content: systemInstruction }],
      { jsonMode: true }
    );

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", response.text);
      throw new Error("AI response was not in the expected JSON format.");
    }
  }
  ```

- [ ] **Step 4: Run test to see it pass.**
  Run: `npx vitest run src/services/ai/coverLetterService.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit the AI service.**
  ```bash
  git add src/services/ai/
  git commit -m "feat(ai): create service for combined CV and cover letter generation"
  ```

### Task 6: Integrate State and Trigger Generation

**Files:**
- Create: `src/features/interview-room/stores/tailoringStore.ts`
- Modify: `src/features/interview-room/components/TailoringView.tsx`

- [ ] **Step 1: Create a Zustand store for the tailoring view.**
  ```ts
  // src/features/interview-room/stores/tailoringStore.ts
  import { create } from 'zustand';
  import { generateTailoredContent } from '@/services/ai/coverLetterService';

  interface TailoringState {
    tailoredCV: string;
    coverLetter: string;
    isLoading: boolean;
    generate: (params: { jobDescription: string; cv: string; prompt: string; style: string; }) => Promise<void>;
  }

  export const useTailoringStore = create<TailoringState>((set) => ({
    tailoredCV: '',
    coverLetter: '',
    isLoading: false,
    generate: async (params) => {
      set({ isLoading: true });
      try {
        const result = await generateTailoredContent(params);
        set({
          tailoredCV: result.cv,
          coverLetter: result.coverLetter,
          isLoading: false,
        });
      } catch (error) {
        console.error(error);
        set({ isLoading: false }); // Handle error state appropriately
      }
    },
  }));
  ```

- [ ] **Step 2: Connect the `TailoringView` component to the store.**
  Modify `TailoringView.tsx` to use the store.
  ```tsx
  // ... imports
  import { useTailoringStore } from '../stores/tailoringStore';

  export const TailoringView = () => {
    const { coverLetter, isLoading, generate } = useTailoringStore();
    const [prompt, setPrompt] = React.useState('');
    const [style, setStyle] = React.useState('formal');

    const handleGenerate = () => {
      // Dummy data for now
      const params = {
        jobDescription: 'A job description.',
        cv: 'An original CV.',
        prompt,
        style,
      };
      generate(params);
    };

    return (
      // ... layout ...
      <Textarea id="custom-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <Select onValueChange={setStyle} defaultValue={style}>
        {/* ... SelectItems ... */}
      </Select>
      <Button onClick={handleGenerate} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Tailor CV & Generate Cover Letter'}
      </Button>
      //...
      <div
        aria-label="Generated Cover Letter"
        role="textbox"
        contentEditable
        dangerouslySetInnerHTML={{ __html: coverLetter }} // Use dangerouslySetInnerHTML for rich text
        className="..."
      />
      //...
    )
  }
  ```

- [ ] **Step 3: Test the integration.**
  Manually test the flow in the browser by navigating to the `/interview-room/1` route.
  1. Fill in the prompt.
  2. Click the generate button.
  3. Verify the loading state on the button appears.
  4. Verify the (mocked) response appears in the rich text editor.

- [ ] **Step 4: Commit the final integration.**
  ```bash
  git add src/features/interview-room/
  git commit -m "feat(integration): connect tailoring view to store and AI service"
  ```


