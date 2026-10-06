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
            'bg-success/10 text-success border-success/30 font-medium gap-1.5',
            className
          )}
        >
          {showIcon && (
            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" aria-hidden="true" />
          )}
          <span>Confirmed</span>
        </Badge>
      );
    case 'needs_confirmation':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-warning/10 text-warning border-warning/30 font-medium gap-1.5',
            className
          )}
        >
          {showIcon && (
            <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" aria-hidden="true" />
          )}
          <span>Needs confirmation</span>
        </Badge>
      );
    case 'observed':
      return (
        <Badge
          variant="outline"
          className={cn('bg-info/10 text-info border-info/30 font-medium gap-1.5', className)}
        >
          {showIcon && <Eye className="w-3.5 h-3.5 text-info shrink-0" aria-hidden="true" />}
          <span>Observed</span>
        </Badge>
      );
    case 'rejected':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-muted text-muted-foreground border-border font-medium gap-1.5',
            className
          )}
        >
          {showIcon && (
            <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
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
