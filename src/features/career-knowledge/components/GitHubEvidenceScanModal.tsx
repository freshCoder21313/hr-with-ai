import React, { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Github, Loader2, Info } from 'lucide-react';
import { careerKnowledgeAppService } from '@/services/careerKnowledge/careerKnowledgeAppService';
import { toast } from 'sonner';

interface GitHubEvidenceScanModalProps {
  profileId: string;
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: () => void;
}

export const GitHubEvidenceScanModal: React.FC<GitHubEvidenceScanModalProps> = ({
  profileId,
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [createCandidates, setCreateCandidates] = useState(true);
  const [scanning, setScanning] = useState(false);

  if (!isOpen) return null;

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Please provide a GitHub username');
      return;
    }

    setScanning(true);
    try {
      const result = await careerKnowledgeAppService.acquireGitHubEvidence(
        profileId,
        username.trim(),
        token.trim() || undefined,
        createCandidates
      );

      if (result.status === 'success') {
        toast.success(
          `Acquired ${result.evidence.length} evidence records and ${result.candidateFacts.length} observed candidates.`
        );
        onScanComplete();
        onClose();
      } else if (result.status === 'no_results') {
        toast.info('No public repositories found for this GitHub account.');
      } else if (result.status === 'auth_error') {
        toast.error('GitHub authentication failed. Check your token.');
      } else if (result.status === 'rate_limited') {
        toast.error('GitHub rate limit reached. Add a personal access token.');
      } else {
        toast.error(result.error || 'Failed to acquire GitHub evidence.');
      }
    } catch (err) {
      toast.error('GitHub scan failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setScanning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleScan}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Github className="w-5 h-5" aria-hidden="true" />
              Acquire GitHub Evidence
            </DialogTitle>
            <DialogDescription>
              Scan public repository activity to collect provenance evidence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label htmlFor="gh-username" className="text-xs font-semibold text-foreground">
                GitHub Username *
              </label>
              <Input
                id="gh-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. torvalds"
                required
                disabled={scanning}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="gh-token" className="text-xs font-semibold text-foreground">
                GitHub Personal Access Token (Optional)
              </label>
              <Input
                id="gh-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                disabled={scanning}
              />
              <p className="text-[11px] text-muted-foreground">
                Optional. Increases GitHub API rate limits.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="gh-candidates"
                checked={createCandidates}
                onCheckedChange={(checked) => setCreateCandidates(Boolean(checked))}
                disabled={scanning}
              />
              <label
                htmlFor="gh-candidates"
                className="text-xs font-medium text-foreground cursor-pointer"
              >
                Generate unconfirmed candidate facts for repositories
              </label>
            </div>

            <div className="p-3 bg-info/10 border border-info/30 rounded-lg text-info text-xs flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-info" aria-hidden="true" />
              <span className="text-foreground">
                <strong className="text-foreground">Evidence is not confirmation:</strong> Code
                repositories represent observed external evidence, not automatically verified
                professional skill.
              </span>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={onClose}
              disabled={scanning}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              type="submit"
              disabled={!username.trim() || scanning}
              className="gap-1.5"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Scanning...
                </>
              ) : (
                <>
                  <Github className="w-4 h-4" aria-hidden="true" /> Scan & Acquire
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
