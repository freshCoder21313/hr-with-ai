import { describe, it, expect, vi } from 'vitest';
import { extractSkills, generateSubSkills, generateQuiz } from './skillAssessmentAiService';
import * as aiConfigService from '@/services/ai/aiConfigService';

vi.mock('@/services/ai/aiConfigService', () => ({
  getService: vi.fn(),
}));

describe('skillAssessmentAiService', () => {
  const mockConfig = { apiKey: 'test' };

  it('should extract skills', async () => {
    const mockGenerateStructured = vi.fn().mockResolvedValue(['React', 'TypeScript']);
    vi.mocked(aiConfigService.getService).mockResolvedValue({
      generateStructured: mockGenerateStructured,
    } as never);

    const skills = await extractSkills('I know React and TypeScript', mockConfig);
    expect(skills).toEqual(['React', 'TypeScript']);
    expect(mockGenerateStructured).toHaveBeenCalled();
  });

  it('should generate sub-skills', async () => {
    const mockGenerateStructured = vi.fn().mockResolvedValue(['Hooks', 'State']);
    vi.mocked(aiConfigService.getService).mockResolvedValue({
      generateStructured: mockGenerateStructured,
    } as never);

    const subSkills = await generateSubSkills('React', mockConfig);
    expect(subSkills).toEqual(['Hooks', 'State']);
    expect(mockGenerateStructured).toHaveBeenCalled();
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
    const mockGenerateStructured = vi.fn().mockResolvedValue(mockQuiz);
    vi.mocked(aiConfigService.getService).mockResolvedValue({
      generateStructured: mockGenerateStructured,
    } as never);

    const quiz = await generateQuiz('React', ['Hooks'], 1, mockConfig);
    expect(quiz).toEqual(mockQuiz);
    expect(mockGenerateStructured).toHaveBeenCalled();
  });
});