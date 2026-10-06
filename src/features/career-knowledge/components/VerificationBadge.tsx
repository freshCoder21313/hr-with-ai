import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Eye, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VerificationState } from '@/types/careerKnowledge';

interface VerificationBadgeProps {
  state: VerificationState;
  className?: string;
  showIcon?: boolean;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  state,
  className,
  showIcon = true,
}) => {
  switch (state) {
    case 'confirmed':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 font-medium gap-1.5',
            className
          )}
        >
          {showIcon && (
            <CheckCircle2
              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
              aria-hidden="true"
            />
          )}
          <span>Confirmed</span>
        </Badge>
      );
    case 'needs_confirmation':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-medium gap-1.5',
            className
          )}
        >
          {showIcon && (
            <AlertCircle
              className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0"
              aria-hidden="true"
            />
          )}
          <span>Needs confirmation</span>
        </Badge>
      );
    case 'observed':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 font-medium gap-1.5',
            className
          )}
        >
          {showIcon && (
            <Eye
              className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0"
              aria-hidden="true"
            />
          )}
          <span>Observed</span>
        </Badge>
      );
    case 'rejected':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-medium gap-1.5',
            className
          )}
        >
          {showIcon && (
            <XCircle
              className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0"
              aria-hidden="true"
            />
          )}
          <span>Rejected</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={className}>
          {state}
        </Badge>
      );
  }
};
