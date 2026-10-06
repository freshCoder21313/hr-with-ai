import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VerificationBadge } from './VerificationBadge';
import { Check, X, ShieldCheck, ExternalLink, Info } from 'lucide-react';
import type { CareerFact, CareerEvidence } from '@/types/careerKnowledge';
import { careerKnowledgeAppService } from '@/services/careerKnowledge/careerKnowledgeAppService';

interface CandidateReviewCardProps {
  candidate: CareerFact;
  onConfirm: (candidate: CareerFact) => Promise<void>;
  onReject: (candidate: CareerFact) => Promise<void>;
  disabled?: boolean;
}

export const CandidateReviewCard: React.FC<CandidateReviewCardProps> = ({
  candidate,
  onConfirm,
  onReject,
  disabled = false,
}) => {
  const [evidenceList, setEvidenceList] = useState<CareerEvidence[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingEvidence(true);
    careerKnowledgeAppService
      .getFactDetail(candidate.id)
      .then((detail) => {
        if (isMounted && detail) {
          setEvidenceList(detail.evidence);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingEvidence(false);
      });

    return () => {
      isMounted = false;
    };
  }, [candidate.id]);

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      await onConfirm(candidate);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      await onReject(candidate);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="border-warning/30 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground px-2 py-0.5 bg-muted rounded">
              {candidate.category}
            </span>
            <VerificationBadge state={candidate.verificationState} />
          </div>
          <span className="text-xs text-muted-foreground">
            Discovered: {new Date(candidate.createdAt).toLocaleDateString()}
          </span>
        </div>
        <CardTitle className="text-lg font-bold text-foreground mt-1">
          {candidate.subject}
        </CardTitle>
        <CardDescription className="text-xs">
          Candidate information discovered from{' '}
          <strong className="capitalize">{candidate.origin.replace('_', ' ')}</strong>. Awaiting
          your explicit confirmation.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* What the system found */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Claim Assertion
          </div>
          <div className="p-3 bg-muted/30 border border-border rounded-lg text-sm leading-relaxed text-foreground font-medium">
            {`"${candidate.claim}"`}
          </div>
        </div>

        {/* Why it exists & Supporting Evidence */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Provenance & Evidence
          </div>

          {loadingEvidence ? (
            <div
              role="status"
              aria-live="polite"
              className="text-xs text-muted-foreground italic py-1"
            >
              Loading supporting evidence...
            </div>
          ) : evidenceList.length === 0 ? (
            <div className="p-2.5 text-xs text-muted-foreground bg-muted/20 rounded-lg flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>Created directly via user interaction without external attachment.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {evidenceList.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 bg-muted/20 border border-border rounded-lg text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-muted-foreground flex-wrap gap-2">
                    <span className="font-semibold text-foreground uppercase tracking-wide px-1.5 py-0.5 bg-muted rounded">
                      Source: {ev.sourceType.replace('_', ' ')}
                    </span>
                    {ev.sourceRef && (
                      <span className="font-mono text-[11px] truncate max-w-xs">
                        {ev.sourceRef}
                      </span>
                    )}
                  </div>
                  {ev.excerpt && (
                    <blockquote className="border-l-2 border-primary/40 pl-2 italic text-muted-foreground whitespace-pre-wrap mt-1">
                      {ev.excerpt}
                    </blockquote>
                  )}
                  {ev.url && (
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline mt-1 font-medium"
                    >
                      <ExternalLink className="w-3 h-3" aria-hidden="true" /> View Evidence Link
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What the user can do */}
        <div className="pt-2 border-t flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Confirming adds this to canonical facts.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={disabled || processing}
              aria-label={`Reject candidate "${candidate.subject}"`}
              className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <X className="w-4 h-4" aria-hidden="true" /> Reject
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirm}
              disabled={disabled || processing}
              aria-label={`Confirm candidate "${candidate.subject}"`}
              className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
            >
              <Check className="w-4 h-4" aria-hidden="true" /> Confirm as Fact
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
