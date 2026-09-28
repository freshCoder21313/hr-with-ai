import { describe, it, expect, beforeEach } from 'vitest';
import { useSkillAssessmentStore } from './useSkillAssessmentStore';
import { QuizQuestion } from '@/features/skill-assessment/types';

const question = (id: string): QuizQuestion => ({
  id,
  question: `Question ${id}`,
  options: ['A', 'B'],
  correct_answer: 'A',
  explanation: 'because',
  sub_skill: 'Core',
});

describe('useSkillAssessmentStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSkillAssessmentStore.getState().reset();
  });

  it('keeps quiz progress in storage so a mid-quiz reload does not lose answers', () => {
    useSkillAssessmentStore.getState().setQuizQuestions([question('q1'), question('q2')]);
    useSkillAssessmentStore.getState().answerQuestion('q1', 'B');
    useSkillAssessmentStore.getState().setStep('quiz');

    const persisted = JSON.parse(localStorage.getItem('skill-assessment-store') ?? '{}');
    expect(persisted.state.step).toBe('quiz');
    expect(persisted.state.userAnswers).toEqual({ q1: 'B' });
    expect(persisted.state.quizQuestions).toHaveLength(2);
  });

  it('restores quiz progress from storage', async () => {
    useSkillAssessmentStore.getState().setQuizQuestions([question('q1')]);
    useSkillAssessmentStore.getState().answerQuestion('q1', 'A');
    useSkillAssessmentStore.getState().setStep('quiz');
    const snapshot = localStorage.getItem('skill-assessment-store') as string;

    // Simulate a reload: blank memory, storage byte-identical to a page load.
    useSkillAssessmentStore.setState({
      step: 'upload',
      userAnswers: {},
      quizQuestions: [],
      quizScore: null,
    });
    localStorage.setItem('skill-assessment-store', snapshot);
    await useSkillAssessmentStore.persist.rehydrate();

    const state = useSkillAssessmentStore.getState();
    expect(state.step).toBe('quiz');
    expect(state.userAnswers).toEqual({ q1: 'A' });
    expect(state.quizQuestions).toHaveLength(1);
  });

  it('persists the extraction mode instead of resetting it to auto', async () => {
    useSkillAssessmentStore.getState().setExtractionMode('regex');

    const persisted = JSON.parse(localStorage.getItem('skill-assessment-store') ?? '{}');
    expect(persisted.state.extractionMode).toBe('regex');

    useSkillAssessmentStore.setState({ extractionMode: 'auto' });
    localStorage.setItem('skill-assessment-store', JSON.stringify(persisted));
    await useSkillAssessmentStore.persist.rehydrate();
    expect(useSkillAssessmentStore.getState().extractionMode).toBe('regex');
  });

  it('does not persist transient loading state', () => {
    useSkillAssessmentStore.getState().setIsLoading(true);
    const persisted = JSON.parse(localStorage.getItem('skill-assessment-store') ?? '{}');
    expect(persisted.state.isLoading).toBeUndefined();
  });

  it('clears answers when a new question set is generated', () => {
    useSkillAssessmentStore.getState().setQuizQuestions([question('q1')]);
    useSkillAssessmentStore.getState().answerQuestion('q1', 'A');
    useSkillAssessmentStore.getState().calculateScore();
    expect(useSkillAssessmentStore.getState().quizScore).toBe(100);

    useSkillAssessmentStore.getState().setQuizQuestions([question('q2')]);
    const state = useSkillAssessmentStore.getState();
    expect(state.userAnswers).toEqual({});
    expect(state.quizScore).toBeNull();
  });

  it('clears answers and score on clearQuiz', () => {
    useSkillAssessmentStore.getState().setQuizQuestions([question('q1')]);
    useSkillAssessmentStore.getState().answerQuestion('q1', 'A');
    useSkillAssessmentStore.getState().calculateScore();

    useSkillAssessmentStore.getState().clearQuiz();

    const state = useSkillAssessmentStore.getState();
    expect(state.userAnswers).toEqual({});
    expect(state.quizQuestions).toEqual([]);
    expect(state.quizScore).toBeNull();
  });

  it('drops a persisted mock quiz instead of showing its fabricated score', async () => {
    // A run saved by a build that generated mock questions with a fake key.
    localStorage.setItem(
      'skill-assessment-store',
      JSON.stringify({
        version: 0,
        state: {
          step: 'result',
          selectedSkill: 'React',
          quizQuestions: [
            {
              id: 'q-0',
              question: 'Mock Question 1 about React',
              options: ['Option A', 'Option B'],
              correct_answer: 'Option A',
              explanation: '',
              sub_skill: 'General Knowledge',
            },
          ],
          userAnswers: { 'q-0': 'Option A' },
          quizScore: 100,
        },
      })
    );

    await useSkillAssessmentStore.persist.rehydrate();

    const state = useSkillAssessmentStore.getState();
    expect(state.quizScore).toBeNull();
    expect(state.quizQuestions).toHaveLength(0);
    expect(state.userAnswers).toEqual({});
    expect(state.step).toBe('select_skill');
  });

  it('keeps the extraction mode across reset', () => {
    useSkillAssessmentStore.getState().setExtractionMode('regex');
    useSkillAssessmentStore.getState().reset();
    expect(useSkillAssessmentStore.getState().extractionMode).toBe('regex');
  });

  it('scores from the current answer key', () => {
    const store = useSkillAssessmentStore.getState();
    store.setQuizQuestions([question('q1'), question('q2')]);
    useSkillAssessmentStore.getState().answerQuestion('q1', 'A');
    useSkillAssessmentStore.getState().answerQuestion('q2', 'B');
    useSkillAssessmentStore.getState().calculateScore();

    expect(useSkillAssessmentStore.getState().quizScore).toBe(50);
    expect(useSkillAssessmentStore.getState().step).toBe('result');
  });
});
