import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SelectSkillStep } from './SelectSkillStep';
import { useSkillAssessmentStore } from '@/features/skill-assessment/stores/useSkillAssessmentStore';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import {
  generateQuiz,
  generateSubSkills,
} from '@/features/skill-assessment/services/skillAssessmentAiService';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/services/ai/aiConfigService', () => ({
  getStoredAIConfig: vi.fn(),
}));

vi.mock('@/events/apiKeyEvents', () => ({
  openApiKeyModal: vi.fn(),
  subscribeToApiKeyModal: vi.fn(() => () => undefined),
}));

vi.mock('@/features/skill-assessment/services/skillAssessmentAiService', () => ({
  generateSubSkills: vi.fn(),
  generateQuiz: vi.fn(),
}));

const selectReact = () => fireEvent.click(screen.getByRole('button', { name: 'React' }));

const startAssessment = () =>
  fireEvent.click(screen.getByRole('button', { name: /start assessment/i }));

describe('SelectSkillStep — API key gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useSkillAssessmentStore.getState().reset();
    useSkillAssessmentStore.setState({ extractedSkills: ['React', 'Node'] });
  });

  it('refuses to start a mock quiz when no API key is configured', async () => {
    vi.mocked(getStoredAIConfig).mockReturnValue({ apiKey: '' });
    render(<SelectSkillStep />);

    selectReact();
    startAssessment();

    await waitFor(() => expect(openApiKeyModal).toHaveBeenCalled());

    const state = useSkillAssessmentStore.getState();
    expect(state.step).not.toBe('quiz');
    expect(state.quizQuestions).toHaveLength(0);
    expect(state.quizScore).toBeNull();
    expect(generateSubSkills).not.toHaveBeenCalled();
    expect(generateQuiz).not.toHaveBeenCalled();
  });

  it('advertises the missing key and offers a way to configure it', () => {
    vi.mocked(getStoredAIConfig).mockReturnValue({ apiKey: '' });
    render(<SelectSkillStep />);

    expect(screen.getByRole('alert')).toHaveTextContent(/api key is required/i);
    fireEvent.click(screen.getByRole('button', { name: /configure api key/i }));
    expect(openApiKeyModal).toHaveBeenCalled();
  });

  it('runs the real AI flow and enters the quiz when a key is configured', async () => {
    vi.mocked(getStoredAIConfig).mockReturnValue({ apiKey: 'key-1' });
    vi.mocked(generateSubSkills).mockResolvedValue(['Hooks']);
    vi.mocked(generateQuiz).mockResolvedValue([
      {
        id: 'q1',
        question: 'What is a hook?',
        options: ['A', 'B'],
        correct_answer: 'A',
        explanation: 'because',
        sub_skill: 'Hooks',
      },
    ]);

    render(<SelectSkillStep />);
    selectReact();
    startAssessment();

    await waitFor(() => {
      expect(useSkillAssessmentStore.getState().step).toBe('quiz');
    });
    expect(generateSubSkills).toHaveBeenCalledWith('React', { apiKey: 'key-1' });
    expect(generateQuiz).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
