import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VerificationBadge } from './VerificationBadge';
import { Check, X, Undo2, ChevronRight, History } from 'lucide-react';
import type { CareerFact } from '@/types/careerKnowledge';

interface FactCardProps {
  fact: CareerFact;
  onSelect: (fact: CareerFact) => void;
  onConfirm?: (fact: CareerFact) => void;
  onReject?: (fact: CareerFact) => void;
  onInvalidate?: (fact: CareerFact) => void;
}

export const FactCard: React.FC<FactCardProps> = ({
  fact,
  onSelect,
  onConfirm,
  onReject,
  onInvalidate,
}) => {
  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                {fact.category}
              </span>
              <VerificationBadge state={fact.verificationState} />
              {fact.supersededBy && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  <History className="w-3 h-3" /> Superseded
                </span>
              )}
            </div>
            <h4 className="font-semibold text-base text-foreground leading-snug group-hover:text-primary transition-colors">
              {fact.subject}
            </h4>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {fact.verificationState === 'needs_confirmation' && (
              <>
                {onReject && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReject(fact)}
                    aria-label={`Reject fact "${fact.subject}"`}
                    className="h-8 px-2 text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                {onConfirm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onConfirm(fact)}
                    aria-label={`Confirm fact "${fact.subject}"`}
                    className="h-8 px-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
            {fact.verificationState === 'confirmed' && onInvalidate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onInvalidate(fact)}
                aria-label={`Re-review fact "${fact.subject}"`}
                title="Move back to needs confirmation"
                className="h-8 px-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect(fact)}
              aria-label={`View details for "${fact.subject}"`}
              className="h-8 px-2 text-muted-foreground group-hover:text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p
          className="text-sm text-muted-foreground line-clamp-2 leading-relaxed"
          onClick={() => onSelect(fact)}
        >
          {fact.claim}
        </p>

        <div
          className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60"
          onClick={() => onSelect(fact)}
        >
          <span className="capitalize">Origin: {fact.origin.replace('_', ' ')}</span>
          <span>Updated: {new Date(fact.updatedAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};
