import { GitHubRepo } from '@/lib/github';
import { Project } from '@/types/resume';
import { AIConfigInput, resolveConfig } from '@/services/ai/aiConfigService';
import { getRepoToProjectPrompt, getGitHubInterviewPrompt } from './githubPrompt';
import { fetchFileTree } from '@/lib/github';
import { Type } from '@google/genai';
import { AIService } from '@/features/ai-provider/ai.service';
import { AIConfig, UserSettings } from '@/types';
import { loadUserSettings } from '@/services/core/settingsService';

const createServiceWithRetry = async (config: AIConfigInput) => {
  const resolved = resolveConfig(config);
  const settings = await loadUserSettings();
  const providerConfig: AIConfig = {
    apiKey: resolved.apiKey,
    baseUrl: resolved.baseUrl,
    modelId: resolved.modelId,
    provider: resolved.baseUrl ? 'openai' : 'google',
  };
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
  return new AIService(providerConfig, retryOptions);
};

export const convertRepoToProject = async (
  repo: GitHubRepo,
  readme: string,
  configInput: AIConfigInput
): Promise<Project> => {
  const config = resolveConfig(configInput);
  const service = await createServiceWithRetry(configInput);

  // Fetch file tree for deeper analysis
  const fileTree = await fetchFileTree(
    repo.owner.login,
    repo.name,
    repo.default_branch,
    (config as UserSettings).githubToken
  );

  const prompt = getRepoToProjectPrompt(repo, readme, fileTree);

  try {
    let jsonText = '';

    if (config.baseUrl) {
      // Custom OpenAI/Compatible Provider
      const response = await service.generateText([{ role: 'user', content: prompt }], {
        jsonMode: true,
      });
      jsonText = response.text || '';
    } else {
      // Google Gemini
      const schema = {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          url: { type: Type.STRING },
          roles: { type: Type.ARRAY, items: { type: Type.STRING } },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
        },
        required: ['name', 'description', 'highlights', 'keywords', 'url'],
      };
      const response = await service.generateText([{ role: 'user', content: prompt }], { schema });
      jsonText = response.text || '';
    }

    if (!jsonText) throw new Error('No project data generated');

    // Clean markdown code blocks if present (though JSON mode usually prevents this)
    jsonText = jsonText.replace(/```json\n?|\n?```/g, '').trim();

    const project = JSON.parse(jsonText) as Project;

    // Fallback/Validation: Ensure URL is set to repo URL if AI missed it
    // Fallback/Validation: Ensure URL is set to repo URL if AI missed it
    if (!project.url) project.url = repo.html_url;

    // Generate Interview Questions as part of deep dive
    try {
      project.suggestedInterviewQuestions = await generateGitHubInterviewQuestions(
        repo,
        readme,
        fileTree,
        configInput
      );
    } catch {
      // AI generation failed, project will use basic info
    }

    return project;
  } catch (error) {
    console.error(`Error converting repo ${repo.name}:`, error);
    // Return a basic fallback if AI fails, so the flow doesn't break entirely
    return {
      name: repo.name,
      description: repo.description || 'GitHub Repository',
      highlights: [`${repo.stargazers_count} Stars`, `Language: ${repo.language}`],
      keywords: repo.topics || [repo.language || ''],
      url: repo.html_url,
      roles: ['Maintainer'],
      endDate: repo.updated_at.split('T')[0],
    } as Project;
  }
};

export const generateGitHubInterviewQuestions = async (
  repo: GitHubRepo,
  readme: string,
  fileTree: string,
  configInput: AIConfigInput
) => {
  const service = await createServiceWithRetry(configInput);

  const prompt = getGitHubInterviewPrompt(repo, readme, fileTree);

  try {
    const response = await service.generateText([{ role: 'user', content: prompt }], {
      jsonMode: true,
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error('Error generating GitHub questions:', error);
    return [];
  }
};
