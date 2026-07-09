import { GitHubRepo } from '@/lib/github';
import { Project } from '@/types/resume';
import { AIConfigInput } from '@/services/ai/aiConfigService';
import { getRepoToProjectPrompt, getGitHubInterviewPrompt } from './githubPrompt';
import { fetchFileTree } from '@/lib/github';
import { getService } from '@/services/ai/aiConfigService';
import { githubInterviewQuestionsSchema, githubProjectSchema } from '@/services/ai/schemas';

export const convertRepoToProject = async (
  repo: GitHubRepo,
  readme: string,
  configInput: AIConfigInput,
  githubToken?: string
): Promise<Project> => {
  const service = await getService(configInput);

  const fileTree = await fetchFileTree(
    repo.owner.login,
    repo.name,
    repo.default_branch,
    githubToken
  );

  const prompt = getRepoToProjectPrompt(repo, readme, fileTree);

  try {
    const project: Project = await service.generateStructured(
      [{ role: 'user', content: prompt }],
      githubProjectSchema
    );

    if (!project.url) project.url = repo.html_url;

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
  const service = await getService(configInput);

  const prompt = getGitHubInterviewPrompt(repo, readme, fileTree);

  try {
    return await service.generateStructured(
      [{ role: 'user', content: prompt }],
      githubInterviewQuestionsSchema
    );
  } catch (error) {
    console.error('Error generating GitHub questions:', error);
    return [];
  }
};
