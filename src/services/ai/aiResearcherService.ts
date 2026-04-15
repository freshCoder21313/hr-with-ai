import { getCompanyIntelPrompt } from '@/features/interview/promptSystem';
import { AIService } from '@/features/ai-provider/ai.service';
import { getStoredAIConfig } from './aiConfigService';
import { loadUserSettings } from '@/services/core/settingsService';

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
    const response = await service.generateText([{ role: 'user', content: prompt }], {
      jsonMode: true,
    });

    let jsonText = response.text || '';
    if (!jsonText) throw new Error('No intellectual data generated');

    // Clean JSON if needed
    jsonText = jsonText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonText) as CompanyIntel;
  } catch (error) {
    console.error('Error researching company:', error);
    throw error;
  }
};
