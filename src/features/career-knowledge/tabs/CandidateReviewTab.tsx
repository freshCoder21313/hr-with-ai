import React from 'react';
import { CandidateReviewCard } from '../components/CandidateReviewCard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CheckCircle2, FileText, Github } from 'lucide-react';
import type { CareerFact } from '@/types/careerKnowledge';
import { careerKnowledgeAppService } from '@/services/careerKnowledge/careerKnowledgeAppService';
import { toast } from 'sonner';

interface CandidateReviewTabProps {
  candidates: CareerFact[];
  onRefresh: () => void;
  onOpenResumeImport: () => void;
  onOpenGitHubScan: () => void;
}

export const CandidateReviewTab: React.FC<CandidateReviewTabProps> = ({
  candidates,
  onRefresh,
  onOpenResumeImport,
  onOpenGitHubScan,
}) => {
  const handleConfirmCandidate = async (candidate: CareerFact) => {
    try {
      await careerKnowledgeAppService.confirmFact(candidate.id);
      toast.success(`Confirmed "${candidate.subject}" into canonical knowledge.`);
      onRefresh();
    } catch (err) {
      toast.error('Failed to confirm fact: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRejectCandidate = async (candidate: CareerFact) => {
    try {
      await careerKnowledgeAppService.rejectFact(candidate.id);
      toast.info(`Rejected claim "${candidate.subject}".`);
      onRefresh();
    } catch (err) {
      toast.error('Failed to reject fact: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">Candidate Review Queue</h3>
          <p className="text-xs text-muted-foreground">
            Review discovered claims before they become canonical facts. Only your explicit
            confirmation validates truth.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenResumeImport}
            className="gap-1.5 text-xs"
          >
            <FileText className="w-3.5 h-3.5" /> Import Resume
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenGitHubScan}
            className="gap-1.5 text-xs"
          >
            <Github className="w-3.5 h-3.5" /> Scan GitHub
          </Button>
        </div>
      </div>

      {candidates.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-10 h-10 text-emerald-600" aria-hidden="true" />}
          title="All candidates reviewed!"
          message="No claims currently need confirmation. You can import a resume or acquire external evidence to discover new candidates."
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={onOpenResumeImport} size="sm" className="gap-1.5 text-xs">
                <FileText className="w-4 h-4" aria-hidden="true" /> Import from Resume
              </Button>
              <Button
                variant="outline"
                onClick={onOpenGitHubScan}
                size="sm"
                className="gap-1.5 text-xs"
              >
                <Github className="w-4 h-4" aria-hidden="true" /> Scan GitHub Evidence
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-muted-foreground">
            Showing {candidates.length} candidate{candidates.length === 1 ? '' : 's'} awaiting your
            decision:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidates.map((candidate) => (
              <CandidateReviewCard
                key={candidate.id}
                candidate={candidate}
                onConfirm={handleConfirmCandidate}
                onReject={handleRejectCandidate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
