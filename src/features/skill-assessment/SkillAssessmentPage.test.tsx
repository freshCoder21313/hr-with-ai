import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SkillAssessmentPage from './SkillAssessmentPage';
import { useSkillAssessmentStore } from './stores/useSkillAssessmentStore';
import { notificationService } from '@/services/core/notificationService';

vi.mock('@/services/core/notificationService', () => ({
  notificationService: { confirm: vi.fn() },
}));

const question = (id: string) => ({
  id,
  question: `Question ${id}`,
  options: ['A', 'B'],
  correct_answer: 'A',
  explanation: 'because',
  sub_skill: 'Core',
});

describe('SkillAssessmentPage — leaving the quiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useSkillAssessmentStore.getState().reset();
  });

  it('clears the current run when the user confirms leaving the quiz', async () => {
    vi.mocked(notificationService.confirm).mockResolvedValue(true);
    useSkillAssessmentStore.setState({
      step: 'quiz',
      selectedSkill: 'React',
      quizQuestions: [question('q1'), question('q2')],
      userAnswers: { q1: 'A' },
    });

    render(<SkillAssessmentPage />);
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => expect(useSkillAssessmentStore.getState().step).toBe('upload'));

    const state = useSkillAssessmentStore.getState();
    expect(state.userAnswers).toEqual({});
    expect(state.quizQuestions).toHaveLength(0);
    expect(state.quizScore).toBeNull();
  });

  it('keeps the run when the user cancels the confirmation', async () => {
    vi.mocked(notificationService.confirm).mockResolvedValue(false);
    useSkillAssessmentStore.setState({
      step: 'quiz',
      selectedSkill: 'React',
      quizQuestions: [question('q1')],
      userAnswers: { q1: 'A' },
    });

    render(<SkillAssessmentPage />);
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));

    const state = useSkillAssessmentStore.getState();
    expect(state.step).toBe('quiz');
    expect(state.userAnswers).toEqual({ q1: 'A' });
  });
});
