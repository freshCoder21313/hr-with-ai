import { getCompanyIntelPrompt } from '@/services/prompts';
import { logger } from '@/lib/logger';
import { AIService } from '@/services/ai/ai.service';
import { getStoredAIConfig } from './aiConfigService';
import { loadUserSettings } from '@/services/core/settingsService';
import { companyIntelSchema } from '@/services/ai/schemas';

export interface CompanyIntel {
  culture: string;
  latestNews: string;
  techStack: string[];
  interviewVibe: string;
  suggestedStatus: string;
  suggestedContext: string;
}

export const researchCompany = async (companyName: string): Promise<CompanyIntel> => {
  const aiConfig = getStoredAIConfig();
  const settings = await loadUserSettings();

  const provider = aiConfig.provider || (aiConfig.baseUrl ? 'openai' : 'google');
  const retryOptions =
    settings.maxRetries && settings.maxRetries > 0
      ? {
          retry: {
            maxRetries: settings.maxRetries,
            delay: settings.retryDelay,
            retryOnTimeout: settings.retryOnTimeout,
            retryOnRateLimit: settings.retryOnRateLimit,
          },
        }
      : undefined;

  const service = new AIService(
    {
      apiKey: aiConfig.apiKey,
      baseUrl: aiConfig.baseUrl,
      modelId: aiConfig.modelId,
      provider: provider,
    },
    retryOptions
  );

  const prompt = getCompanyIntelPrompt(companyName);

  try {
    return await service.generateStructured(
      [{ role: 'user', content: prompt }],
      companyIntelSchema
    );
  } catch (error) {
    logger.error('Error researching company:', error);
    throw error;
  }
};
