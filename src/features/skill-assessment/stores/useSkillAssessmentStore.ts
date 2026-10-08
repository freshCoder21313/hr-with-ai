import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { QuizQuestion, AssessmentStep, ExtractionMode } from '@/features/skill-assessment/types';

interface State {
  step: AssessmentStep;
  extractedSkills: string[];
  selectedSkill: string | null;
  subSkills: string[];
  quizQuestionCount: number;
  quizQuestions: QuizQuestion[];
  userAnswers: Record<string, string>;
  quizScore: number | null;
  extractionMode: ExtractionMode;
  isLoading: boolean;
  error: string | null;
  savedAssessmentId: number | null;
  setSavedAssessmentId: (id: number | null) => void;
  setStep: (step: AssessmentStep) => void;
  setExtractedSkills: (skills: string[]) => void;
  setSelectedSkill: (skill: string) => void;
  setSubSkills: (skills: string[]) => void;
  setQuizQuestionCount: (count: number) => void;
  setQuizQuestions: (questions: QuizQuestion[]) => void;
  setExtractionMode: (mode: ExtractionMode) => void;
  answerQuestion: (questionId: string, answer: string) => void;
  calculateScore: () => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearQuiz: () => void;
  reset: () => void;
  testAnotherSkill: () => void;
}

/**
 * Only data survives a reload — actions and transient flags (isLoading/error)
 * are rebuilt on every mount so the UI never renders a stale spinner.
 */
type PersistedState = Pick<
  State,
  | 'step'
  | 'extractedSkills'
  | 'selectedSkill'
  | 'subSkills'
  | 'quizQuestionCount'
  | 'quizQuestions'
  | 'userAnswers'
  | 'quizScore'
  | 'extractionMode'
  | 'savedAssessmentId'
>;

const INITIAL_QUIZ_QUESTION_COUNT = 5;

const initialQuizState = {
  quizQuestions: [] as QuizQuestion[],
  userAnswers: {} as Record<string, string>,
  quizScore: null as number | null,
  savedAssessmentId: null as number | null,
};

export const useSkillAssessmentStore = create<State>()(
  persist(
    (set, get) => ({
      step: 'upload',
      extractedSkills: [],
      selectedSkill: null,
      subSkills: [],
      quizQuestionCount: INITIAL_QUIZ_QUESTION_COUNT,
      extractionMode: 'auto',
      isLoading: false,
      error: null,
      ...initialQuizState,
      setSavedAssessmentId: (id) => set({ savedAssessmentId: id }),
      setStep: (step) => set({ step }),
      setExtractedSkills: (skills) => set({ extractedSkills: skills }),
      setSelectedSkill: (skill) => set({ selectedSkill: skill }),
      setSubSkills: (skills) => set({ subSkills: skills }),
      setQuizQuestionCount: (count) => set({ quizQuestionCount: count }),
      setQuizQuestions: (questions) =>
        // New question set => answers to the previous set are meaningless.
        set({ quizQuestions: questions, userAnswers: {}, quizScore: null, savedAssessmentId: null }),
      setExtractionMode: (mode) => set({ extractionMode: mode }),
      answerQuestion: (qId, answer) =>
        set((state) => ({ userAnswers: { ...state.userAnswers, [qId]: answer } })),
      calculateScore: () => {
        const { quizQuestions, userAnswers } = get();
        if (quizQuestions.length === 0) return;
        let correct = 0;
        quizQuestions.forEach((q) => {
          if (userAnswers[q.id] === q.correct_answer) correct++;
        });
        set({ quizScore: (correct / quizQuestions.length) * 100, step: 'result' });
      },
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearQuiz: () => set({ ...initialQuizState }),
      reset: () =>
        set({
          step: 'upload',
          extractedSkills: [],
          selectedSkill: null,
          subSkills: [],
          quizQuestionCount: INITIAL_QUIZ_QUESTION_COUNT,
          ...initialQuizState,
          isLoading: false,
          error: null,
        }),
      testAnotherSkill: () =>
        set({
          step: 'select_skill',
          selectedSkill: null,
          subSkills: [],
          ...initialQuizState,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'skill-assessment-store',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state): PersistedState => ({
        step: state.step,
        extractedSkills: state.extractedSkills,
        selectedSkill: state.selectedSkill,
        subSkills: state.subSkills,
        quizQuestionCount: state.quizQuestionCount,
        quizQuestions: state.quizQuestions,
        userAnswers: state.userAnswers,
        quizScore: state.quizScore,
        extractionMode: state.extractionMode,
        savedAssessmentId: state.savedAssessmentId,
      }),
      migrate: (persisted) => {
        const state = persisted as Partial<PersistedState> | undefined;
        // Pre-fix builds persisted mock quizzes whose 'correct_answer' was always
        // 'Option A'. Dropping them keeps a fabricated score off the results page.
        if (state?.quizQuestions?.some((q) => q.correct_answer === 'Option A')) {
          return {
            ...(state as PersistedState),
            step: 'select_skill' as AssessmentStep,
            quizQuestions: [],
            userAnswers: {},
            quizScore: null,
          };
        }
        return state as PersistedState;
      },
    }
  )
);
