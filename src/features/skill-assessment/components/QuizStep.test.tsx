import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizStep } from './QuizStep';
import { useSkillAssessmentStore } from '@/features/skill-assessment/stores/useSkillAssessmentStore';
import { QuizQuestion } from '@/features/skill-assessment/types';

vi.mock('@/services/core/notificationService', () => ({
  notificationService: { confirm: vi.fn().mockResolvedValue(true) },
}));

vi.mock('@/components/ui/tooltip', () => {
  const passthrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return {
    TooltipProvider: passthrough,
    Tooltip: passthrough,
    TooltipTrigger: passthrough,
    TooltipContent: passthrough,
  };
});

const q1: QuizQuestion = {
  id: 'q1',
  question: 'What is a hook?',
  options: ['A function', 'A class'],
  correct_answer: 'A function',
  explanation: 'Hooks are functions',
  sub_skill: 'Hooks',
};

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
});
