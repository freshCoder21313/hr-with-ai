import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QuizStep } from './QuizStep';
import { useSkillAssessmentStore } from '@/features/skill-assessment/stores/useSkillAssessmentStore';
import { QuizQuestion } from '@/features/skill-assessment/types';

vi.mock('@/features/skill-assessment/services/skillAssessmentAiService', () => ({
  generateSubSkills: generateSubSkillsMock,
  generateQuiz: generateQuizMock,
}));

vi.mock('@/services/core/notificationService', () => ({
  notificationService: { confirm: vi.fn().mockResolvedValue(true) },
}));

vi.mock('@/services/ai/aiConfigService', () => ({
  getStoredAIConfig: () => ({ apiKey: 'test-key' }),
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

const generateQuizMock = vi.hoisted(() => vi.fn());
const generateSubSkillsMock = vi.hoisted(() => vi.fn());

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

const mkQuestion = (id: string): QuizQuestion => ({ ...q1, id, question: `Q ${id}` });

describe('QuizStep auto-advance timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    useSkillAssessmentStore.getState().reset();
    useSkillAssessmentStore.setState({
      step: 'quiz',
      selectedSkill: 'React',
      quizQuestions: [q1, mkQuestion('q2'), mkQuestion('q3')],
    });
  });

  afterEach(() => vi.useRealTimers());

  const currentQuestion = () => screen.getByText(/Question \d/).textContent;

  it('advances on its own after a new answer', () => {
    render(<QuizStep />);
    expect(currentQuestion()).toContain('Question 1');

    fireEvent.click(screen.getByRole('radio', { name: 'A function' }));
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(currentQuestion()).toContain('Question 2');
  });

  it('does not skip a question when Next is pressed before the timer fires', () => {
    render(<QuizStep />);

    fireEvent.click(screen.getByRole('radio', { name: 'A function' }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(currentQuestion()).toContain('Question 2');

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(currentQuestion()).toContain('Question 2');
  });

  it('does not skip backwards when Previous is pressed before the timer fires', () => {
    render(<QuizStep />);

    fireEvent.click(screen.getByRole('radio', { name: 'A function' }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'A function' }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(currentQuestion()).toContain('Question 3');

    fireEvent.click(screen.getByRole('radio', { name: 'A function' }));
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(currentQuestion()).toContain('Question 2');

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(currentQuestion()).toContain('Question 2');
  });

  it('drops the pending timer on unmount', () => {
    const { unmount } = render(<QuizStep />);

    fireEvent.click(screen.getByRole('radio', { name: 'A function' }));

    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    unmount();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

describe('QuizStep when there is no usable question set', () => {
  beforeEach(() => {
    localStorage.clear();
    useSkillAssessmentStore.getState().reset();
    useSkillAssessmentStore.setState({
      step: 'quiz',
      selectedSkill: 'React',
      quizQuestions: [],
    });
    generateQuizMock.mockReset();
    generateSubSkillsMock.mockReset();
  });

  it('shows a spinner only while generation is in flight', () => {
    useSkillAssessmentStore.setState({ isLoading: true });
    render(<QuizStep />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('offers retry and back instead of an endless spinner when generation failed', async () => {
    useSkillAssessmentStore.setState({ error: 'Failed to generate quiz questions' });
    render(<QuizStep />);

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to generate quiz questions');

    fireEvent.click(screen.getByRole('button', { name: /back to skills/i }));
    expect(useSkillAssessmentStore.getState().step).toBe('select_skill');
  });

  it('retry regenerates the questions instead of faking them', async () => {
    useSkillAssessmentStore.setState({ error: 'Failed to generate quiz questions' });
    generateSubSkillsMock.mockResolvedValue(['Hooks']);
    generateQuizMock.mockResolvedValue([
      { id: 'q9', question: 'Retried?', options: ['A', 'B'], correct_answer: 'A', explanation: '' },
    ]);

    render(<QuizStep />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Retried?')).toBeInTheDocument();
    expect(useSkillAssessmentStore.getState().step).toBe('quiz');
    expect(useSkillAssessmentStore.getState().error).toBeNull();
  });

  it('reports an empty question set as an error state with a way out', () => {
    render(<QuizStep />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The AI returned an empty question set for this skill.'
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeEnabled();
  });
});
