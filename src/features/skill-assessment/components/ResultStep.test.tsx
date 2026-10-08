import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ResultStep } from './ResultStep';
import { useSkillAssessmentStore } from '../stores/useSkillAssessmentStore';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    skillAssessments: {
      add: vi.fn().mockResolvedValue(1),
    },
  },
}));

describe('ResultStep persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSkillAssessmentStore.getState().reset();
  });

  it('persists quiz results to db.skillAssessments once upon displaying results', async () => {
    useSkillAssessmentStore.setState({
      selectedSkill: 'TypeScript',
      quizQuestions: [
        {
          id: 'q1',
          question: 'What is TypeScript?',
          options: ['A', 'B'],
          correct_answer: 'A',
          explanation: 'Superset',
          sub_skill: 'Types',
        },
        {
          id: 'q2',
          question: 'What is Generics?',
          options: ['A', 'B'],
          correct_answer: 'B',
          explanation: 'Reusability',
          sub_skill: 'Generics',
        },
      ],
      userAnswers: {
        q1: 'A',
        q2: 'A', // incorrect
      },
      quizScore: 50,
      step: 'result',
    });

    const { rerender } = render(
      <MemoryRouter>
        <ResultStep />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(db.skillAssessments.add).toHaveBeenCalledTimes(1);
    });

    expect(db.skillAssessments.add).toHaveBeenCalledWith(
      expect.objectContaining({
        skill: 'TypeScript',
        score: 50,
        totalQuestions: 2,
        weaknesses: ['Generics'],
        createdAt: expect.any(Number),
      })
    );

    // Re-render does not trigger duplicate save
    rerender(
      <MemoryRouter>
        <ResultStep />
      </MemoryRouter>
    );

    expect(db.skillAssessments.add).toHaveBeenCalledTimes(1);
  });

  it('does not re-insert record when unmounting and remounting (e.g. reload or route navigation)', async () => {
    useSkillAssessmentStore.setState({
      selectedSkill: 'TypeScript',
      quizQuestions: [
        {
          id: 'q1',
          question: 'Q1',
          options: ['A', 'B'],
          correct_answer: 'A',
          explanation: '',
          sub_skill: 'Types',
        },
      ],
      userAnswers: { q1: 'A' },
      quizScore: 100,
      step: 'result',
    });

    const { unmount } = render(
      <MemoryRouter>
        <ResultStep />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(db.skillAssessments.add).toHaveBeenCalledTimes(1);
    });

    unmount();

    // Re-mount simulates navigating away or reload
    render(
      <MemoryRouter>
        <ResultStep />
      </MemoryRouter>
    );

    // Should still only have been called once
    expect(db.skillAssessments.add).toHaveBeenCalledTimes(1);
  });

  it('does not persist when quizScore is null or questions are empty', async () => {
    useSkillAssessmentStore.setState({
      selectedSkill: 'React',
      quizQuestions: [],
      userAnswers: {},
      quizScore: null,
      step: 'result',
    });

    render(
      <MemoryRouter>
        <ResultStep />
      </MemoryRouter>
    );

    expect(db.skillAssessments.add).not.toHaveBeenCalled();
  });
});
