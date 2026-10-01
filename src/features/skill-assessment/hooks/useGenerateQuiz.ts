import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useSkillAssessmentStore } from '@/features/skill-assessment/stores/useSkillAssessmentStore';
import {
  generateSubSkills,
  generateQuiz,
} from '@/features/skill-assessment/services/skillAssessmentAiService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';

export const MISSING_API_KEY_MESSAGE =
  'An AI API key is required to generate a real assessment. Add one to continue.';

export type GenerateQuizOutcome = 'ok' | 'missing-api-key' | 'failed';

/**
 * The one path from a chosen skill to a usable question set. Both the skill
 * picker and the quiz's retry action go through it, so a retry can never invent
 * questions or diverge from how the first attempt was produced.
 */
export const useGenerateQuiz = () => {
  const { setSubSkills, setQuizQuestions, setStep, setIsLoading, setError, quizQuestionCount } =
    useSkillAssessmentStore();

  const generate = useCallback(
    async (skill: string): Promise<GenerateQuizOutcome> => {
      const config = getStoredAIConfig();

      if (!config.apiKey) {
        // The quiz is scored against a real answer key, so there is nothing to
        // fall back to: block instead of faking a score the user would believe.
        setError(MISSING_API_KEY_MESSAGE);
        return 'missing-api-key';
      }

      try {
        setIsLoading(true);
        setError(null);

        const subSkills = await generateSubSkills(skill, config);
        setSubSkills(subSkills);

        const questions = await generateQuiz(skill, subSkills, quizQuestionCount, config);
        if (!questions || questions.length === 0) {
          throw new Error('Failed to generate quiz questions');
        }

        setQuizQuestions(questions);
        setStep('quiz');
        return 'ok';
      } catch (err) {
        logger.error(err);
        setError(err instanceof Error ? err.message : 'Failed to initialize assessment');
        return 'failed';
      } finally {
        setIsLoading(false);
      }
    },
    [quizQuestionCount, setSubSkills, setQuizQuestions, setStep, setIsLoading, setError]
  );

  return { generate };
};
