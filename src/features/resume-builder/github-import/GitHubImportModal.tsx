import React from 'react';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  Zap,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useGitHubImport } from './useGitHubImport';

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export const GitHubImportModal: React.FC<GitHubImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { state, actions } = useGitHubImport({ isOpen, onClose, onImportComplete });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !state.isLoading && !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Import Projects from GitHub
          </DialogTitle>
          <DialogDescription>
            {state.step === 'credentials' && 'Connect your GitHub account to access repositories.'}
            {state.step === 'selection' && 'Select repositories to transform into portfolio projects.'}
            {state.step === 'processing' &&
              'AI is analyzing your code and writing project descriptions...'}
            {state.step === 'review' && 'Review and edit the AI-generated project entries.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2 min-h-0">
          {state.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state.step === 'credentials' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>GitHub Usernames</Label>
                <Input
                  value={state.usernamesText}
                  onChange={(e) => actions.setUsernamesText(e.target.value)}
                  placeholder="e.g. octocat, facebook, microsoft"
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple usernames or organizations with commas.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Personal Access Token (Optional)</Label>
                <Input
                  value={state.token}
                  onChange={(e) => actions.setToken(e.target.value)}
                  type="password"
                  placeholder="ghp_..."
                />
                <p className="text-xs text-muted-foreground">
                  Required for private repos or higher rate limits. Scopes: `repo` or `public_repo`.
                </p>
              </div>
            </div>
          )}

          {state.step === 'selection' && (
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search repositories..."
                    className="pl-8"
                    value={state.filterText}
                    onChange={(e) => actions.setFilterText(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hideForks"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={state.hideForks}
                    onChange={(e) => actions.setHideForks(e.target.checked)}
                  />
                  <Label htmlFor="hideForks" className="cursor-pointer">
                    Hide Forks
                  </Label>
                </div>
              </div>

              {state.filteredRepos.length < state.repos.length && (
                <div className="text-xs text-muted-foreground flex items-center gap-2 px-1">
                  <AlertCircle className="w-3 h-3" />
                  Showing {state.filteredRepos.length} of {state.repos.length} repositories (
                  {state.repos.length - state.filteredRepos.length} hidden by filters)
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => actions.handleToggleRepo(repo.id)}
                    className={cn(
                      'cursor-pointer border rounded-lg p-4 transition-all hover:bg-accent/50',
                      state.selectedRepoIds.includes(repo.id)
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border'
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold truncate pr-2" title={repo.name}>
                        {repo.name}
                      </h4>
                      {state.selectedRepoIds.includes(repo.id) && (
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
                {state.filteredRepos.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No repositories found matching your filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {state.step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-1">
                <h3 className="font-medium">Analyzing Repositories...</h3>
                <p className="text-muted-foreground text-sm">
                  Processed {state.processedCount} of {state.selectedRepoIds.length}
                </p>
              </div>
            </div>
          )}

          {state.step === 'review' && (
            <div className="space-y-4">
              {state.generatedProjects.map((project, idx) => (
                <Card
                  key={idx}
                  className={cn(
                    'transition-opacity',
                    !state.projectsToImport.has(idx) && 'opacity-50 grayscale'
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
                      variant={state.projectsToImport.has(idx) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => actions.toggleImportProject(idx)}
                    >
                      {state.projectsToImport.has(idx) ? 'Keep' : 'Skip'}
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

                    {project.suggestedInterviewQuestions &&
                      project.suggestedInterviewQuestions.length > 0 && (
                        <div className="mt-4 p-3 bg-indigo-50/50 rounded-md border border-indigo-100">
                          <h5 className="text-xs font-bold text-indigo-700 flex items-center gap-1 mb-2">
                            <Zap className="w-3 h-3" /> Technical Deep-Dive (Target Questions)
                          </h5>
                          <div className="space-y-2">
                            {project.suggestedInterviewQuestions.map((q, qidx) => (
                              <div key={qidx} className="text-[11px]">
                                <span className="font-semibold text-indigo-900">
                                  Q: {q.question}
                                </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {q.topics.map((t) => (
                                    <Badge
                                      key={t}
                                      variant="outline"
                                      className="text-[9px] py-0 h-4 bg-white/50"
                                    >
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-muted/20">
          {state.step === 'credentials' && (
            <Button onClick={actions.handleConnect} disabled={state.isLoading || !state.usernamesText}>
              {state.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect to GitHub
            </Button>
          )}

          {state.step === 'selection' && (
            <div className="flex justify-between w-full">
              <span className="text-sm text-muted-foreground flex items-center">
                {state.selectedRepoIds.length} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => actions.setStep('credentials')}>
                  Back
                </Button>
                <Button onClick={actions.handleProcess} disabled={state.selectedRepoIds.length === 0}>
                  Analyze with AI
                </Button>
              </div>
            </div>
          )}

          {state.step === 'review' && (
            <div className="flex justify-between w-full">
              <span className="text-sm text-muted-foreground flex items-center">
                Importing {state.projectsToImport.size} projects
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose} disabled={state.isLoading}>
                  Cancel
                </Button>
                <Button onClick={actions.handleImport} disabled={state.isLoading || state.projectsToImport.size === 0}>
                  {state.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
