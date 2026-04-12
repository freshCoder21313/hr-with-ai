import { getService, AIConfigInput } from '@/services/ai/aiConfigService';
import { cleanJsonString } from '@/services/ai/aiUtils';
import { QuizQuestion } from '@/features/skill-assessment/types';
import {
  SKILL_EXTRACTOR_PROMPT,
  SUB_SKILL_GENERATOR_PROMPT,
  QUIZ_GENERATOR_PROMPT,
} from './skillPrompts';

export const extractSkills = async (
  text: string,
  configInput: AIConfigInput
): Promise<string[]> => {
  const service = getService(configInput);
  const prompt = `${SKILL_EXTRACTOR_PROMPT}\n\nText:\n${text}`;

  const response = await service.generateText([{ role: 'user', content: prompt }], {
    jsonMode: true,
  });
  const jsonText = response.text || '';
  if (!jsonText) throw new Error('No skills extracted');

  return JSON.parse(cleanJsonString(jsonText)) as string[];
};

export const generateSubSkills = async (
  skill: string,
  configInput: AIConfigInput
): Promise<string[]> => {
  const service = getService(configInput);
  const prompt = SUB_SKILL_GENERATOR_PROMPT.replace('{skill}', skill);

  const response = await service.generateText([{ role: 'user', content: prompt }], {
    jsonMode: true,
  });
  const jsonText = response.text || '';
  if (!jsonText) throw new Error('No sub-skills generated');

  return JSON.parse(cleanJsonString(jsonText)) as string[];
};

export const generateQuiz = async (
  skill: string,
  subSkills: string[],
  count: number,
  configInput: AIConfigInput
): Promise<QuizQuestion[]> => {
  const service = getService(configInput);
  const countInstruction =
    count > 0
      ? `generate exactly ${count} multiple-choice questions.`
      : `generate a suitable, random number of multiple-choice questions (e.g. 5 to 30, depending on the complexity of the skill).`;

  const prompt = QUIZ_GENERATOR_PROMPT.replace('{skill}', skill)
    .replace('{subSkills}', JSON.stringify(subSkills))
    .replace('{countInstruction}', countInstruction);

  const response = await service.generateText([{ role: 'user', content: prompt }], {
    jsonMode: true,
  });
  const jsonText = response.text || '';
  if (!jsonText) throw new Error('No quiz generated');

  return JSON.parse(cleanJsonString(jsonText)) as QuizQuestion[];
};
