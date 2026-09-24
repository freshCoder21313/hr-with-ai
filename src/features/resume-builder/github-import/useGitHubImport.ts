import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { fetchGitHubRepos, fetchReadme, GitHubRepo } from '@/lib/github';
import { loadUserSettings, saveUserSettings } from '@/services/core/settingsService';
import { convertRepoToProject } from './githubAIService';
import { Project } from '@/types/resume';
import { db } from '@/lib/db';
import { UserSettings } from '@/types';

type Step = 'credentials' | 'selection' | 'processing' | 'review';

interface UseGitHubImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export function useGitHubImport({ isOpen, onClose, onImportComplete }: UseGitHubImportProps) {
  const [step, setStep] = useState<Step>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usernamesText, setUsernamesText] = useState('');
  const [token, setToken] = useState('');
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<number[]>([]);
  const [filterText, setFilterText] = useState('');
  const [hideForks, setHideForks] = useState(true);

  const [processedCount, setProcessedCount] = useState(0);

  const [generatedProjects, setGeneratedProjects] = useState<Project[]>([]);
  const [projectsToImport, setProjectsToImport] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadUserSettings().then((s) => {
        setSettings(s);
        if (s.githubUsername) setUsernamesText(s.githubUsername);
        if (s.githubToken) setToken(s.githubToken);
      });
      setStep('credentials');
      setRepos([]);
      setSelectedRepoIds([]);
      setGeneratedProjects([]);
      setProjectsToImport(new Set());
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    let result = repos;
    if (hideForks) {
      result = result.filter((r) => !r.fork);
    }
    if (filterText) {
      const lower = filterText.toLowerCase();
      result = result.filter(
        (r) => r.name.toLowerCase().includes(lower) || r.language?.toLowerCase().includes(lower)
      );
    }
    setFilteredRepos(result);
  }, [repos, filterText, hideForks]);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usernames = usernamesText
        .split(',')
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      if (usernames.length === 0) {
        throw new Error('Please enter at least one GitHub username.');
      }

      let allRepos: GitHubRepo[] = [];
      for (const username of usernames) {
        const fetchedRepos = await fetchGitHubRepos(username, token);
        allRepos = [...allRepos, ...fetchedRepos];
      }

      const uniqueReposMap = new Map<string, GitHubRepo>();
      allRepos.forEach((repo) => {
        uniqueReposMap.set(repo.full_name, repo);
      });
      const uniqueRepos = Array.from(uniqueReposMap.values());

      setRepos(uniqueRepos);

      if (settings) {
        await saveUserSettings({
          ...settings,
          githubUsername: usernamesText,
          githubToken: token,
        });
      }

      setStep('selection');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRepo = (repoId: number) => {
    setSelectedRepoIds((prev) =>
      prev.includes(repoId) ? prev.filter((id) => id !== repoId) : [...prev, repoId]
    );
  };

  const handleProcess = async () => {
    setStep('processing');
    setIsLoading(true);
    setProcessedCount(0);
    setError(null);

    const selectedRepos = repos.filter((r) => selectedRepoIds.includes(r.id));
    const results: Project[] = [];

    const BATCH_SIZE = 3;
    try {
      for (let i = 0; i < selectedRepos.length; i += BATCH_SIZE) {
        const batch = selectedRepos.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map(async (repo) => {
            try {
              const readme = await fetchReadme(repo.owner.login, repo.name, token);
              if (!settings?.apiKey) {
                throw new Error('API Key is missing. Please add it in Settings.');
              }
              return await convertRepoToProject(
                repo,
                readme,
                {
                  apiKey: settings.apiKey,
                  baseUrl: settings.baseUrl,
                  modelId: settings.defaultModel,
                },
                token
              );
            } catch (err) {
              logger.error(`Failed to process ${repo.name}`, err);
              const errMsg = err instanceof Error ? err.message : '';
              if (errMsg.includes('API Key') || errMsg.includes('API_KEY_INVALID')) {
                throw err;
              }
              return null;
            }
          })
        );

        results.push(...(batchResults.filter((p) => p !== null) as Project[]));
        setProcessedCount(Math.min(i + BATCH_SIZE, selectedRepos.length));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during processing.');
      setIsLoading(false);
      return;
    }

    setGeneratedProjects(results);
    setProjectsToImport(new Set(results.map((_, idx) => idx)));

    setStep('review');
    setIsLoading(false);
  };

  const handleImport = async () => {
    setIsLoading(true);
    try {
      const projectsToAdd = generatedProjects.filter((_, idx) => projectsToImport.has(idx));

      if (projectsToAdd.length === 0) {
        setError('No projects selected to import.');
        setIsLoading(false);
        return;
      }

      const mainCV = await db.getMainCV();
      if (!mainCV) {
        setError('No Main CV found. Please create one first.');
        setIsLoading(false);
        return;
      }

      const parsedData = mainCV.parsedData || {
        basics: { name: '', email: '' },
        work: [],
        education: [],
        skills: [],
        projects: [],
      };

      if (!parsedData.projects) parsedData.projects = [];

      const newProjects = projectsToAdd.filter((newP) => {
        const isDuplicate = parsedData.projects.some(
          (existingP: Project) =>
            existingP.name.toLowerCase() === newP.name.toLowerCase() ||
            (existingP.url && newP.url && existingP.url === newP.url)
        );
        return !isDuplicate;
      });

      if (newProjects.length === 0) {
        setError('All selected projects already exist in your CV.');
        setIsLoading(false);
        return;
      }

      parsedData.projects = [...parsedData.projects, ...newProjects];

      await db.resumes.update(mainCV.id!, {
        parsedData,
        updatedAt: Date.now(),
      });

      if (onImportComplete) onImportComplete();
      onClose();
    } catch (err) {
      setError(
        'Failed to save projects to CV: ' + (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleImportProject = (index: number) => {
    const newSet = new Set(projectsToImport);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setProjectsToImport(newSet);
  };

  return {
    state: {
      step,
      isLoading,
      error,
      usernamesText,
      token,
      settings,
      repos,
      filteredRepos,
      selectedRepoIds,
      filterText,
      hideForks,
      processedCount,
      generatedProjects,
      projectsToImport,
    },
    actions: {
      setUsernamesText,
      setToken,
      setFilterText,
      setHideForks,
      setStep,
      handleConnect,
      handleToggleRepo,
      handleProcess,
      handleImport,
      toggleImportProject,
    },
  };
}
