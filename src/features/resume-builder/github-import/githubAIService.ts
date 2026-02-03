import { GitHubRepo } from '@/lib/github';
import { Project } from '@/types/resume';
import { AIConfigInput, resolveConfig } from '@/services/geminiService';
import { getRepoToProjectPrompt } from './githubPrompt';
import { Type } from '@google/genai';
import { AIService } from '@/features/ai-provider/ai.service';
import { AIConfig } from '@/types';

export const convertRepoToProject = async (
  repo: GitHubRepo,
  readme: string,
  configInput: AIConfigInput
): Promise<Project> => {
  const config = resolveConfig(configInput);
  const providerConfig: AIConfig = {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    modelId: config.modelId,
    provider: config.baseUrl ? 'openai' : 'google',
  };
  const service = new AIService(providerConfig);

  const prompt = getRepoToProjectPrompt(repo, readme);

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
    if (!project.url) project.url = repo.html_url;

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
