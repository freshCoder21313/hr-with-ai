import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Github,
  Loader2,
  Search,
  Check,
  AlertCircle,
  ExternalLink,
  Calendar,
  Star,
  GitFork,
  User,
} from 'lucide-react';
import { fetchGitHubRepos, fetchReadme, GitHubRepo } from '@/lib/github';
import { loadUserSettings, saveUserSettings } from '@/services/settingsService';
import { convertRepoToProject } from './githubAIService';
import { Project } from '@/types/resume';
import { db } from '@/lib/db';
import { UserSettings } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void; // Callback to refresh UI
}

type Step = 'credentials' | 'selection' | 'processing' | 'review';

export const GitHubImportModal: React.FC<GitHubImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<Step>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credentials State
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [settings, setSettings] = useState<UserSettings | null>(null);

  // Selection State
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<number[]>([]);
  const [filterText, setFilterText] = useState('');
  const [hideForks, setHideForks] = useState(true);

  // Processing State
  const [processedCount, setProcessedCount] = useState(0);

  // Review State
  const [generatedProjects, setGeneratedProjects] = useState<Project[]>([]);
  const [projectsToImport, setProjectsToImport] = useState<Set<number>>(new Set()); // Index in generatedProjects array

  // Load Settings on Open
  useEffect(() => {
    if (isOpen) {
      loadUserSettings().then((s) => {
        setSettings(s);
        if (s.githubUsername) setUsername(s.githubUsername);
        if (s.githubToken) setToken(s.githubToken);
        // If credentials exist, maybe skip to selection?
        // Let's force user to confirm credentials for now
      });
      // Reset state
      setStep('credentials');
      setRepos([]);
      setSelectedRepoIds([]);
      setGeneratedProjects([]);
      setProjectsToImport(new Set());
      setError(null);
    }
  }, [isOpen]);

  // Filter Repos Effect
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
      const fetchedRepos = await fetchGitHubRepos(username, token);
      setRepos(fetchedRepos);

      // Save credentials
      if (settings) {
        await saveUserSettings({
          ...settings,
          githubUsername: username,
          githubToken: token,
        });
      }

      setStep('selection');
    } catch (err: any) {
      setError(err.message || 'Failed to connect to GitHub');
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

    // Process in batches of 3 to improve speed while respecting rate limits
    const BATCH_SIZE = 3;
    try {
      for (let i = 0; i < selectedRepos.length; i += BATCH_SIZE) {
        const batch = selectedRepos.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map(async (repo) => {
            try {
              const readme = await fetchReadme(repo.owner.login, repo.name, token);
              // Ensure API key is present
              if (!settings?.apiKey) {
                throw new Error('API Key is missing. Please add it in Settings.');
              }
              // Pass the FULL settings object as config so it can use custom baseURL/model if set
              // This fixes the issue where custom APIs were being ignored and defaulting to Google's endpoint
              return await convertRepoToProject(repo, readme, {
                apiKey: settings.apiKey,
                baseUrl: settings.baseUrl,
                modelId: settings.defaultModel,
              });
            } catch (err: any) {
              console.error(`Failed to process ${repo.name}`, err);
              // If it's an API key error, we should probably stop the whole process and alert user
              if (err.message?.includes('API Key') || err.message?.includes('API_KEY_INVALID')) {
                throw err;
              }
              return null;
            }
          })
        );

        // Filter out nulls (failed items)
        results.push(...(batchResults.filter((p) => p !== null) as Project[]));
        setProcessedCount(Math.min(i + BATCH_SIZE, selectedRepos.length));
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during processing.');
      setIsLoading(false);
      return;
    }

    setGeneratedProjects(results);
    // Default all to be imported
    setProjectsToImport(new Set(results.map((_, idx) => idx)));

    setStep('review');
    setIsLoading(false);
  };

  const handleImport = async () => {
    setIsLoading(true);
    try {
      const projectsToAdd = generatedProjects.filter((_, idx) => projectsToImport.has(idx));

      if (projectsToAdd.length === 0) {
        onClose();
        return;
      }

      // Add to Main CV
      const mainCV = await db.getMainCV();
      if (!mainCV) {
        setError('No Main CV found. Please create one first.');
        setIsLoading(false);
        return;
      }

      let parsedData = mainCV.parsedData || {
        basics: { name: '', email: '' },
        work: [],
        education: [],
        skills: [],
        projects: [],
      };

      if (!parsedData.projects) parsedData.projects = [];

      // Check for duplicates before adding
      const newProjects = projectsToAdd.filter((newP) => {
        // Check if a project with the same name or URL already exists
        const isDuplicate = parsedData.projects.some(
          (existingP) =>
            existingP.name.toLowerCase() === newP.name.toLowerCase() ||
            (existingP.url && newP.url && existingP.url === newP.url)
        );
        return !isDuplicate;
      });

      if (newProjects.length < projectsToAdd.length) {
        // Warn about duplicates? Or just silently skip?
        // For now, let's just append non-duplicates to be safe and clean.
        console.log(`Skipped ${projectsToAdd.length - newProjects.length} duplicates.`);
      }

      if (newProjects.length === 0) {
        // All were duplicates
        setError('All selected projects already exist in your CV.');
        setIsLoading(false);
        return;
      }

      parsedData.projects = [...parsedData.projects, ...newProjects];

      await db.resumes.update(mainCV.id!, {
        parsedData,
        updatedAt: Date.now(),
      });

      if (newProjects.length < projectsToAdd.length) {
        // Warn about duplicates? Or just silently skip?
        // For now, let's just append non-duplicates to be safe and clean.
        console.log(`Skipped ${projectsToAdd.length - newProjects.length} duplicates.`);
      }

      if (newProjects.length === 0) {
        // All were duplicates
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
    } catch (err: any) {
      setError('Failed to save projects to CV: ' + err.message);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Import Projects from GitHub
          </DialogTitle>
          <DialogDescription>
            {step === 'credentials' && 'Connect your GitHub account to access repositories.'}
            {step === 'selection' && 'Select repositories to transform into portfolio projects.'}
            {step === 'processing' &&
              'AI is analyzing your code and writing project descriptions...'}
            {step === 'review' && 'Review and edit the AI-generated project entries.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2 min-h-0">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'credentials' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>GitHub Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. octocat"
                />
              </div>
              <div className="space-y-2">
                <Label>Personal Access Token (Optional)</Label>
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  type="password"
                  placeholder="ghp_..."
                />
                <p className="text-xs text-muted-foreground">
                  Required for private repos or higher rate limits. Scopes: `repo` or `public_repo`.
                </p>
              </div>
            </div>
          )}

          {step === 'selection' && (
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search repositories..."
                    className="pl-8"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hideForks"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={hideForks}
                    onChange={(e) => setHideForks(e.target.checked)}
                  />
                  <Label htmlFor="hideForks" className="cursor-pointer">
                    Hide Forks
                  </Label>
                </div>
              </div>

              {filteredRepos.length < repos.length && (
                <div className="text-xs text-muted-foreground flex items-center gap-2 px-1">
                  <AlertCircle className="w-3 h-3" />
                  Showing {filteredRepos.length} of {repos.length} repositories (
                  {repos.length - filteredRepos.length} hidden by filters)
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => handleToggleRepo(repo.id)}
                    className={cn(
                      'cursor-pointer border rounded-lg p-4 transition-all hover:bg-accent/50',
                      selectedRepoIds.includes(repo.id)
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border'
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold truncate pr-2" title={repo.name}>
                        {repo.name}
                      </h4>
                      {selectedRepoIds.includes(repo.id) && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 h-8">
                      {repo.description || 'No description provided.'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-yellow-400" />
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" /> {repo.stargazers_count}
                      </span>
                      {repo.fork && (
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3 h-3" /> Fork
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {filteredRepos.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No repositories found matching your filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-1">
                <h3 className="font-medium">Analyzing Repositories...</h3>
                <p className="text-muted-foreground text-sm">
                  Processed {processedCount} of {selectedRepoIds.length}
                </p>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              {generatedProjects.map((project, idx) => (
                <Card
                  key={idx}
                  className={cn(
                    'transition-opacity',
                    !projectsToImport.has(idx) && 'opacity-50 grayscale'
                  )}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        {project.name}
                        {project.url && (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {project.keywords?.map((k) => (
                          <Badge key={k} variant="secondary" className="text-[10px]">
                            {k}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant={projectsToImport.has(idx) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleImportProject(idx)}
                    >
                      {projectsToImport.has(idx) ? 'Keep' : 'Skip'}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{project.description}</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {project.highlights?.map((h, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          {h}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                      {project.endDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {project.endDate}
                        </span>
                      )}
                      {project.roles?.length && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {project.roles.join(', ')}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-muted/20">
          {step === 'credentials' && (
            <Button onClick={handleConnect} disabled={isLoading || !username}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect to GitHub
            </Button>
          )}

          {step === 'selection' && (
            <div className="flex justify-between w-full">
              <span className="text-sm text-muted-foreground flex items-center">
                {selectedRepoIds.length} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('credentials')}>
                  Back
                </Button>
                <Button onClick={handleProcess} disabled={selectedRepoIds.length === 0}>
                  Analyze with AI
                </Button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="flex justify-between w-full">
              <span className="text-sm text-muted-foreground flex items-center">
                Importing {Array.from(projectsToImport).length} projects
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={isLoading || projectsToImport.size === 0}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Import
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
