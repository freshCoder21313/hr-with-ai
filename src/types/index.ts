export * from './resume';
export * from './ai';
export * from './settings';
export * from './jobs';
export * from './interview';

export interface SkillAssessmentRecord {
  id?: number;
  skill: string;
  score: number;
  totalQuestions: number;
  subSkillScores?: { name: string; score: number; total: number; correct: number }[];
  weaknesses?: string[];
  createdAt: number;
}
