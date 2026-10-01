import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizStep } from './QuizStep';
import { useSkillAssessmentStore } from '@/features/skill-assessment/stores/useSkillAssessmentStore';
import { QuizQuestion } from '@/features/skill-assessment/types';

vi.mock('@/services/core/notificationService', () => ({
  notificationService: { confirm: vi.fn().mockResolvedValue(true) },
}));

const q1: QuizQuestion = {
  id: 'q1',
  question: 'What is a hook?',
  options: ['A function', 'A class'],
  correct_answer: 'A function',
  explanation: 'Hooks are functions',
  sub_skill: 'Hooks',
};

const HINT = 'Hooks must start with "use"';

describe('QuizStep accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    useSkillAssessmentStore.getState().reset();
    useSkillAssessmentStore.setState({
      step: 'quiz',
      selectedSkill: 'React',
      quizQuestions: [q1],
    });
  });

  it('lets a keyboard user reach and select an answer', () => {
    render(<QuizStep />);

    const option = screen.getByRole('radio', { name: /a function/i });
    // The input is visually hidden but still in the tab order (sr-only, not `hidden`).
    expect(option.className).toContain('sr-only');
    option.focus();
    expect(document.activeElement).toBe(option);

    fireEvent.click(option);
    expect(useSkillAssessmentStore.getState().userAnswers).toEqual({ q1: 'A function' });
  });

  it('exposes the hint as a toggleable disclosure instead of a hover-only tooltip', () => {
    useSkillAssessmentStore.setState({ quizQuestions: [{ ...q1, hint: HINT }] });
    render(<QuizStep />);

    // The hint is not exposed until the user asks for it.
    expect(screen.queryByText(HINT)).toBeNull();

    const toggle = screen.getByRole('button', { name: 'Show hint' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls');

    fireEvent.click(toggle);

    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // aria-controls resolves to the region that actually holds the hint.
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toContainElement(
      screen.getByText(HINT)
    );

    fireEvent.click(toggle);
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it('omits the hint control when the question has no hint', () => {
    render(<QuizStep />);
    expect(screen.queryByRole('button', { name: 'Show hint' })).toBeNull();
  });
});
