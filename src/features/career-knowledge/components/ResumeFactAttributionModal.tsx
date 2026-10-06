import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VerificationBadge } from './VerificationBadge';
import { ShieldCheck, ExternalLink, Loader2, BookOpen } from 'lucide-react';
import {
  careerKnowledgeAppService,
  type FactDetailResult,
} from '@/services/careerKnowledge/careerKnowledgeAppService';

interface ResumeFactAttributionModalProps {
  factIds: string[];
  isOpen: boolean;
  onClose: () => void;
}

export const ResumeFactAttributionModal: React.FC<ResumeFactAttributionModalProps> = ({
  factIds,
  isOpen,
  onClose,
}) => {
  const [details, setDetails] = useState<Array<FactDetailResult | null>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || factIds.length === 0) return;

    let isMounted = true;
    Promise.all(factIds.map((id) => careerKnowledgeAppService.getFactDetail(id)))
      .then((res) => {
        if (isMounted) setDetails(res);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, factIds]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
            Career Knowledge Provenance
          </DialogTitle>
          <DialogDescription className="text-xs">
            This resume item was projected from canonical Career Knowledge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              className="py-6 flex items-center justify-center text-muted-foreground"
            >
              <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
              <span className="sr-only">Loading fact provenance...</span>
            </div>
          ) : details.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground border border-border rounded-lg bg-muted/20">
              No fact identifiers linked to this item.
            </div>
          ) : (
            details.map((item, idx) => {
              const factId = factIds[idx];
              if (!item) {
                return (
                  <div
                    key={factId}
                    className="p-3 border border-border rounded-lg bg-muted/20 text-xs text-muted-foreground space-y-1"
                  >
                    <div className="font-semibold text-foreground">Source Fact Not Found</div>
                    <div>
                      Fact ID <code className="font-mono text-[11px]">{factId}</code> was not found
                      in the local profile (it may have been deleted or originated from another
                      profile).
                    </div>
                  </div>
                );
              }

              const { fact, evidence } = item;
              return (
                <div
                  key={fact.id}
                  className="p-3.5 border border-border rounded-lg bg-card space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                        {fact.category}
                      </span>
                      <VerificationBadge state={fact.verificationState} />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Updated {new Date(fact.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-sm text-foreground">{fact.subject}</h5>
                    <p className="text-xs text-muted-foreground mt-1 bg-muted/30 p-2 rounded">
                      {`"${fact.claim}"`}
                    </p>
                  </div>

                  {/* Supporting Evidence */}
                  {evidence.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-border/50">
                      <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-primary" aria-hidden="true" />{' '}
                        Supporting Evidence ({evidence.length})
                      </div>
                      {evidence.map((ev) => (
                        <div
                          key={ev.id}
                          className="text-[11px] text-muted-foreground pl-2 border-l border-primary/30"
                        >
                          <span className="font-semibold capitalize">
                            {ev.sourceType.replace('_', ' ')}
                          </span>
                          {ev.excerpt && (
                            <span className="italic block truncate">{`"${ev.excerpt}"`}</span>
                          )}
                          {ev.url && (
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" /> Source URL
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
