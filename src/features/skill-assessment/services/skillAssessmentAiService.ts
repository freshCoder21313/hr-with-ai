import { getService, AIConfigInput } from '@/services/ai/aiConfigService';
import { cleanJsonString } from '@/services/aiUtils';
import { QuizQuestion } from '../types';
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
  const prompt = QUIZ_GENERATOR_PROMPT.replace('{skill}', skill)
    .replace('{subSkills}', JSON.stringify(subSkills))
    .replace('{count}', count.toString());

  const response = await service.generateText([{ role: 'user', content: prompt }], {
    jsonMode: true,
  });
  const jsonText = response.text || '';
  if (!jsonText) throw new Error('No quiz generated');

  return JSON.parse(cleanJsonString(jsonText)) as QuizQuestion[];
};
