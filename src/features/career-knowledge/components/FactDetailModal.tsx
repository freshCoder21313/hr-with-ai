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
import {
  ExternalLink,
  FileText,
  Calendar,
  Tag,
  ShieldCheck,
  History,
  Undo2,
  Check,
  X,
} from 'lucide-react';
import {
  careerKnowledgeAppService,
  type FactDetailResult,
} from '@/services/careerKnowledge/careerKnowledgeAppService';
import { toast } from 'sonner';

interface FactDetailModalProps {
  factId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onFactUpdated?: () => void;
}

export const FactDetailModal: React.FC<FactDetailModalProps> = ({
  factId,
  isOpen,
  onClose,
  onFactUpdated,
}) => {
  const [detail, setDetail] = useState<FactDetailResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !factId) return;

    let isMounted = true;
    careerKnowledgeAppService
      .getFactDetail(factId)
      .then((res) => {
        if (isMounted) setDetail(res);
      })
      .catch((err) => {
        toast.error(
          'Failed to load fact details: ' + (err instanceof Error ? err.message : String(err))
        );
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, factId]);

  if (!isOpen || !factId) return null;

  const handleConfirm = async () => {
    if (!detail) return;
    try {
      await careerKnowledgeAppService.confirmFact(detail.fact.id);
      toast.success('Fact confirmed');
      const updated = await careerKnowledgeAppService.getFactDetail(detail.fact.id);
      setDetail(updated);
      onFactUpdated?.();
    } catch (err) {
      toast.error('Confirmation failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    try {
      await careerKnowledgeAppService.rejectFact(detail.fact.id);
      toast.success('Fact rejected');
      const updated = await careerKnowledgeAppService.getFactDetail(detail.fact.id);
      setDetail(updated);
      onFactUpdated?.();
    } catch (err) {
      toast.error('Rejection failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleInvalidate = async () => {
    if (!detail) return;
    try {
      await careerKnowledgeAppService.invalidateFact(detail.fact.id);
      toast.info('Fact moved back to needs confirmation');
      const updated = await careerKnowledgeAppService.getFactDetail(detail.fact.id);
      setDetail(updated);
      onFactUpdated?.();
    } catch (err) {
      toast.error('Invalidate failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const fact = detail?.fact;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground px-2 py-0.5 bg-muted rounded">
              {fact?.category || 'Fact'}
            </span>
            {fact && <VerificationBadge state={fact.verificationState} />}
            {fact?.origin && (
              <span className="text-xs text-muted-foreground">
                Origin: <strong className="capitalize">{fact.origin.replace('_', ' ')}</strong>
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-bold">{fact?.subject || 'Fact Details'}</DialogTitle>
          <DialogDescription>
            Canonical personal career claim and supporting immutable evidence.
          </DialogDescription>
        </DialogHeader>

        {loading || !detail || !fact ? (
          <div role="status" aria-live="polite" className="py-8 text-center text-muted-foreground">
            Loading details...
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Superseded Warning */}
            {fact.supersededBy && (
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm flex items-start gap-2">
                <History className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <div className="font-semibold text-foreground">
                    This claim has been superseded
                  </div>
                  <div className="text-xs mt-0.5 text-muted-foreground">
                    A newer version of this fact was created. This historical record is preserved
                    for provenance.
                  </div>
                </div>
              </div>
            )}

            {/* Canonical Claim */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Canonical Claim
              </label>
              <div className="p-3 rounded-lg border border-border bg-card text-card-foreground text-base leading-relaxed">
                {fact.claim}
              </div>
            </div>

            {/* Structured Data if present */}
            {fact.structured && Object.keys(fact.structured).length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Structured Properties
                </label>
                <div className="p-3 rounded-lg border border-border bg-muted/40 font-mono text-xs overflow-x-auto space-y-1">
                  {Object.entries(fact.structured).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="font-semibold text-primary">{k}:</span>
                      <span className="text-foreground">
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground p-3 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Created: {new Date(fact.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Updated: {new Date(fact.updatedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Linked Evidence */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Supporting Evidence (
                {detail.evidence.length})
              </label>
              {detail.evidence.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground border border-border rounded-lg bg-muted/10 italic">
                  No external or resume evidence explicitly attached.
                </div>
              ) : (
                <div className="space-y-2">
                  {detail.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 border border-border rounded-lg bg-card text-sm space-y-1.5"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <span className="font-semibold uppercase tracking-wide px-1.5 py-0.5 bg-muted rounded text-primary">
                          {ev.sourceType.replace('_', ' ')}
                        </span>
                        <span className="text-muted-foreground">
                          Captured: {new Date(ev.capturedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {ev.sourceRef && (
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          Ref: {ev.sourceRef}
                        </div>
                      )}
                      {ev.excerpt && (
                        <blockquote className="border-l-2 border-primary/40 pl-2 text-xs italic text-muted-foreground whitespace-pre-wrap">
                          {ev.excerpt}
                        </blockquote>
                      )}
                      {ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <ExternalLink className="w-3 h-3" /> View Source URL
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {detail.notes.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Notes ({detail.notes.length})
                </label>
                <div className="space-y-1.5">
                  {detail.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-2.5 border border-border rounded-lg bg-muted/20 text-xs"
                    >
                      {note.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2 border-t">
          <div>
            {fact?.verificationState === 'confirmed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInvalidate}
                className="gap-1.5 text-warning border-warning/30 hover:bg-warning/10"
              >
                <Undo2 className="w-3.5 h-3.5" /> Request Re-review
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {fact?.verificationState === 'needs_confirmation' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  className="gap-1 text-destructive hover:bg-destructive/10"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleConfirm}
                  className="gap-1 bg-success hover:bg-success/90 text-success-foreground"
                >
                  <Check className="w-3.5 h-3.5" /> Confirm
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
