import { describe, it, expect, vi } from 'vitest';
import { extractSkills, generateSubSkills, generateQuiz } from './skillAssessmentAiService';
import * as aiConfigService from '@/services/ai/aiConfigService';

vi.mock('@/services/ai/aiConfigService', () => ({
  getService: vi.fn(),
}));

describe('skillAssessmentAiService', () => {
  const mockConfig = { apiKey: 'test' };

  it('should extract skills', async () => {
    const mockGenerateText = vi.fn().mockResolvedValue({ text: '["React", "TypeScript"]' });
    vi.mocked(aiConfigService.getService).mockReturnValue({
      generateText: mockGenerateText,
    } as any);

    const skills = await extractSkills('I know React and TypeScript', mockConfig);
    expect(skills).toEqual(['React', 'TypeScript']);
    expect(mockGenerateText).toHaveBeenCalled();
  });

  it('should generate sub-skills', async () => {
    const mockGenerateText = vi.fn().mockResolvedValue({ text: '["Hooks", "State"]' });
    vi.mocked(aiConfigService.getService).mockReturnValue({
      generateText: mockGenerateText,
    } as any);

    const subSkills = await generateSubSkills('React', mockConfig);
    expect(subSkills).toEqual(['Hooks', 'State']);
    expect(mockGenerateText).toHaveBeenCalled();
  });

  it('should generate quiz', async () => {
    const mockQuiz = [
      {
        id: '1',
        question: 'What is a hook?',
        options: ['A', 'B', 'C', 'D'],
        correct_answer: 'A',
        explanation: 'A is correct',
        sub_skill: 'Hooks',
      },
    ];
    const mockGenerateText = vi.fn().mockResolvedValue({ text: JSON.stringify(mockQuiz) });
    vi.mocked(aiConfigService.getService).mockReturnValue({
      generateText: mockGenerateText,
    } as any);

    const quiz = await generateQuiz('React', ['Hooks'], 1, mockConfig);
    expect(quiz).toEqual(mockQuiz);
    expect(mockGenerateText).toHaveBeenCalled();
  });
});
