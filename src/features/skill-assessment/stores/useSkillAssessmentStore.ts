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
  reset: () =>
    set({
      step: 'upload',
      extractedSkills: [],
      selectedSkill: null,
      subSkills: [],
      quizQuestions: [],
      userAnswers: {},
      quizScore: null,
      isLoading: false,
      error: null,
      quizQuestionCount: 5,
    }),
}));
