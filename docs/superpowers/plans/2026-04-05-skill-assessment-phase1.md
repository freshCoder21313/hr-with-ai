# Skill Assessment Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 1 of the Skill Assessment feature, allowing users to upload a CV, extract skills, select a skill, generate sub-skills, configure quiz length, and complete a multiple-choice Quick Quiz.

**Architecture:** A new React feature module `src/features/skill-assessment`. State is managed by a local Zustand store `useSkillAssessmentStore.ts`. AI operations are integrated into the existing `src/features/ai-provider/ai.service.ts`. UI components will reuse shadcn/ui primitives. Tests will be written with Vitest.

**Tech Stack:** React, TypeScript, Zustand, Tailwind CSS, Vite, Vitest, AI Service.

---

## Chunk 1: Phase 1 Implementation

### Task 1: Setup Routing and Store

**Files:**
- Modify: `src/App.tsx`
- Create: `src/features/skill-assessment/SkillAssessmentPage.tsx`
- Create: `src/features/skill-assessment/stores/useSkillAssessmentStore.ts`
- Create: `src/features/skill-assessment/types.ts`

- [ ] **Step 1: Create types file**
Write `src/features/skill-assessment/types.ts`:
```typescript
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  sub_skill: string;
}

export type AssessmentStep = 'upload' | 'select_skill' | 'quiz' | 'result';
```

- [ ] **Step 2: Create the Zustand store**
Write `src/features/skill-assessment/stores/useSkillAssessmentStore.ts` to include configuration, loading, and error states. Note that `userAnswers` uses the question ID as the key and the selected option string as the value:
```typescript
import { create } from 'zustand';
import { QuizQuestion, AssessmentStep } from '../types';

interface State {
  step: AssessmentStep;
  extractedSkills: string[];
  selectedSkill: string | null;
  subSkills: string[];
  quizQuestionCount: number;
  quizQuestions: QuizQuestion[];
  userAnswers: Record<string, string>;
  quizScore: number | null;
  isLoading: boolean;
  error: string | null;
  setStep: (step: AssessmentStep) => void;
  setExtractedSkills: (skills: string[]) => void;
  setSelectedSkill: (skill: string) => void;
  setSubSkills: (skills: string[]) => void;
  setQuizQuestionCount: (count: number) => void;
  setQuizQuestions: (questions: QuizQuestion[]) => void;
  answerQuestion: (questionId: string, answer: string) => void;
  calculateScore: () => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSkillAssessmentStore = create<State>((set, get) => ({
  step: 'upload',
  extractedSkills: [],
  selectedSkill: null,
  subSkills: [],
  quizQuestionCount: 5,
  quizQuestions: [],
  userAnswers: {},
  quizScore: null,
  isLoading: false,
  error: null,
  setStep: (step) => set({ step }),
  setExtractedSkills: (skills) => set({ extractedSkills: skills }),
  setSelectedSkill: (skill) => set({ selectedSkill: skill }),
  setSubSkills: (skills) => set({ subSkills: skills }),
  setQuizQuestionCount: (count) => set({ quizQuestionCount: count }),
  setQuizQuestions: (questions) => set({ quizQuestions: questions }),
  answerQuestion: (qId, answer) => set((state) => ({ userAnswers: { ...state.userAnswers, [qId]: answer } })),
  calculateScore: () => {
    const { quizQuestions, userAnswers } = get();
    if (quizQuestions.length === 0) return;
    let correct = 0;
    quizQuestions.forEach(q => {
      if (userAnswers[q.id] === q.correct_answer) correct++;
    });
    set({ quizScore: (correct / quizQuestions.length) * 100, step: 'result' });
  },
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ step: 'upload', extractedSkills: [], selectedSkill: null, subSkills: [], quizQuestions: [], userAnswers: {}, quizScore: null, isLoading: false, error: null, quizQuestionCount: 5 })
}));
```

- [ ] **Step 3: Create barebones Page component**
Write `src/features/skill-assessment/SkillAssessmentPage.tsx` returning a simple container.

- [ ] **Step 4: Add to App router**
Modify `src/App.tsx` to add `<Route path="/skill-assessment" element={<SkillAssessmentPage />} />`.

- [ ] **Step 5: Commit**
Run `git add src/App.tsx src/features/skill-assessment` and `git commit -m "feat(skill-assessment): setup routing and store"`

### Task 2: Implement AI Prompts and Service

**Files:**
- Create: `src/features/skill-assessment/services/skillPrompts.ts`
- Create: `src/features/skill-assessment/services/skillAssessmentAiService.ts`

- [ ] **Step 1: Create prompts**
Write `src/features/skill-assessment/services/skillPrompts.ts`:
```typescript
export const SKILL_EXTRACTOR_PROMPT = `Extract a list of technical and soft skills from the following text. Return ONLY a valid JSON array of strings.`;
export const SUB_SKILL_GENERATOR_PROMPT = `Given the skill "{skill}", generate 3-5 key sub-skills. Return ONLY a valid JSON array of strings.`;
export const QUIZ_GENERATOR_PROMPT = `Given the skill "{skill}" and sub-skills {subSkills}, generate {count} multiple-choice questions. Return ONLY valid JSON array of objects with keys: id (uuid), question, options (array of 4 strings), correct_answer, explanation, sub_skill.`;
```

- [ ] **Step 2: Create service wrapper**
Write `src/features/skill-assessment/services/skillAssessmentAiService.ts`. Explicitly import `aiService` from `@/features/ai-provider/ai.service`. Export three functions: `extractSkills(text)`, `generateSubSkills(skill)`, and `generateQuiz(skill, subSkills, count)`. Each function must call `aiService.generateText([{ role: 'user', content: prompt }])`, parse the returned text as JSON, and validate the structure before returning.

- [ ] **Step 3: Write tests for service**
Create `src/features/skill-assessment/services/skillAssessmentAiService.test.ts`.

- [ ] **Step 4: Run tests**
Run `npx vitest run src/features/skill-assessment/services/skillAssessmentAiService.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**
Run `git commit -am "feat: implement ai services for skill assessment"`

### Task 3: Build Upload and Selection UI

**Files:**
- Create: `src/features/skill-assessment/components/UploadStep.tsx`
- Create: `src/features/skill-assessment/components/SelectSkillStep.tsx`
- Modify: `src/features/skill-assessment/SkillAssessmentPage.tsx`

- [ ] **Step 1: Implement UploadStep with validations**
Write `src/features/skill-assessment/components/UploadStep.tsx`. Validate file size (<5MB) and type (`.txt`, `.pdf`, `.docx`). **Crucially: import and use the existing `parseResume(file)` utility from `@/services/resumeParser` to extract the text.** Call `extractSkills`. Handle errors by showing a manual entry text input as a fallback if AI extraction fails. On success, `setExtractedSkills` and move to `select_skill`.

- [ ] **Step 2: Implement SelectSkillStep with configurations**
Write `src/features/skill-assessment/components/SelectSkillStep.tsx`. Render `extractedSkills` as clickable badges. Include a configuration dropdown/radio for `quizQuestionCount` (5, 10, 15). Also provide a manual input to let the user type a broader skill if the AI extracted ones are too niche.
When user clicks "Start Assessment", trigger `generateSubSkills` and then `generateQuiz(selectedSkill, subSkills, quizQuestionCount)`. Show `isLoading` during this. On success, move to `quiz` step. Add a "Retry" button if it fails.

- [ ] **Step 3: Integrate steps into Page**
Modify `SkillAssessmentPage.tsx` to conditionally render `UploadStep` or `SelectSkillStep`.

- [ ] **Step 4: Test rendering**
(Manual) Verify file upload size validation.

- [ ] **Step 5: Commit**
Run `git commit -am "feat: upload and selection ui with fallbacks"`

### Task 4: Build Quiz UI and Scoring

**Files:**
- Create: `src/features/skill-assessment/components/QuizStep.tsx`
- Create: `src/features/skill-assessment/components/ResultStep.tsx`
- Modify: `src/features/skill-assessment/SkillAssessmentPage.tsx`

- [ ] **Step 1: Implement QuizStep with Navigation**
Write `src/features/skill-assessment/components/QuizStep.tsx`. Keep track of the `currentQuestionIndex` via local state. Render the question from `store.quizQuestions[currentQuestionIndex]`. Use radio buttons for the options. **Crucially: Implement "Next" and "Prev" buttons to allow navigation between questions.** Use `answerQuestion` to save answers to the store. On the last question, the "Next" button should become a "Submit" button which calls `calculateScore()`.

- [ ] **Step 2: Implement ResultStep**
Write `src/features/skill-assessment/components/ResultStep.tsx`. Display `quizScore`. Add a "Finish" button calling `reset()`.

- [ ] **Step 3: Integrate into Page**
Modify `SkillAssessmentPage` to also conditionally render `QuizStep` and `ResultStep` based on `store.step` (without removing the existing logic). *Note: Database persistence to Dexie.js for the final report is deferred to Phase 2 after the Interview feature is built.*

- [ ] **Step 4: Run typecheck**
Run `npm run typecheck` to ensure all hooks and props are typed correctly. Expected: no errors.

- [ ] **Step 5: Run linter and verify**
Run `npm run lint` and `npm run test` to ensure all new code meets project quality standards. Address any issues if found.

- [ ] **Step 6: Commit**
Run `git commit -am "feat: quiz step and scoring"`
