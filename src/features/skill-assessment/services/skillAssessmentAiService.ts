import { getService, AIConfigInput } from '@/services/ai/aiConfigService';
import { QuizQuestion } from '@/features/skill-assessment/types';
import { stringArraySchema, quizQuestionsSchema } from '@/services/ai/schemas';
import {
  SKILL_EXTRACTOR_PROMPT,
  SUB_SKILL_GENERATOR_PROMPT,
  QUIZ_GENERATOR_PROMPT,
} from './skillPrompts';

export const extractSkills = async (
  text: string,
  configInput: AIConfigInput
): Promise<string[]> => {
  const service = await getService(configInput);
  const prompt = `${SKILL_EXTRACTOR_PROMPT}\n\nText:\n${text}`;

  return service.generateStructured([{ role: 'user', content: prompt }], stringArraySchema);
};

export const generateSubSkills = async (
  skill: string,
  configInput: AIConfigInput
): Promise<string[]> => {
  const service = await getService(configInput);
  const prompt = SUB_SKILL_GENERATOR_PROMPT.replace('{skill}', skill);

  return service.generateStructured([{ role: 'user', content: prompt }], stringArraySchema);
};

export const generateQuiz = async (
  skill: string,
  subSkills: string[],
  count: number,
  configInput: AIConfigInput
): Promise<QuizQuestion[]> => {
  const service = await getService(configInput);
  const countInstruction =
    count > 0
      ? `generate exactly ${count} multiple-choice questions.`
      : `generate a suitable, random number of multiple-choice questions (e.g. 5 to 30, depending on the complexity of the skill).`;

  const prompt = QUIZ_GENERATOR_PROMPT.replace('{skill}', skill)
    .replace('{subSkills}', JSON.stringify(subSkills))
    .replace('{countInstruction}', countInstruction);

  return service.generateStructured([{ role: 'user', content: prompt }], quizQuestionsSchema);
};
