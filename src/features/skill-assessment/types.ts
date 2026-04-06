export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  sub_skill: string;
  hint?: string;
}

export type AssessmentStep = 'upload' | 'select_skill' | 'quiz' | 'result';
