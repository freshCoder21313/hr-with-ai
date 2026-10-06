import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Lock,
  FileWarning,
  HelpCircle,
  CloudOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SyncStatus } from '@/services/careerKnowledge/syncService';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  className?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ status, className }) => {
  switch (status) {
    case 'success':
      return (
        <Badge
          variant="outline"
          className={cn('bg-success/10 text-success border-success/30 gap-1.5', className)}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" aria-hidden="true" />
          <span>Synced</span>
        </Badge>
      );
    case 'syncing':
      return (
        <Badge
          variant="outline"
          className={cn('bg-info/10 text-info border-info/30 gap-1.5', className)}
        >
          <RefreshCw className="w-3.5 h-3.5 text-info animate-spin shrink-0" aria-hidden="true" />
          <span>Syncing...</span>
        </Badge>
      );
    case 'retryable_error':
      return (
        <Badge
          variant="outline"
          className={cn('bg-warning/10 text-warning border-warning/30 gap-1.5', className)}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" aria-hidden="true" />
          <span>Temporary Network Issue (Retryable)</span>
        </Badge>
      );
    case 'auth_failure':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-destructive/10 text-destructive border-destructive/30 gap-1.5',
            className
          )}
        >
          <Lock className="w-3.5 h-3.5 text-destructive shrink-0" aria-hidden="true" />
          <span>Authentication Required</span>
        </Badge>
      );
    case 'authorization_failure':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-destructive/10 text-destructive border-destructive/30 gap-1.5',
            className
          )}
        >
          <Lock className="w-3.5 h-3.5 text-destructive shrink-0" aria-hidden="true" />
          <span>Profile Not Available</span>
        </Badge>
      );
    case 'conflict':
      return (
        <Badge
          variant="outline"
          className={cn('bg-warning/10 text-warning border-warning/30 gap-1.5', className)}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" aria-hidden="true" />
          <span>Cloud Version Conflict</span>
        </Badge>
      );
    case 'schema_mismatch':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-destructive/10 text-destructive border-destructive/30 gap-1.5',
            className
          )}
        >
          <FileWarning className="w-3.5 h-3.5 text-destructive shrink-0" aria-hidden="true" />
          <span>Incompatible Version</span>
        </Badge>
      );
    case 'unknown_outcome':
      return (
        <Badge
          variant="outline"
          className={cn('bg-warning/10 text-warning border-warning/30 gap-1.5', className)}
        >
          <HelpCircle className="w-3.5 h-3.5 text-warning shrink-0" aria-hidden="true" />
          <span>Outcome Unconfirmed (Safe to retry)</span>
        </Badge>
      );
    case 'non_retryable_error':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-destructive/10 text-destructive border-destructive/30 gap-1.5',
            className
          )}
        >
          <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" aria-hidden="true" />
          <span>Sync Error</span>
        </Badge>
      );
    case 'idle':
    default:
      return (
        <Badge
          variant="outline"
          className={cn('bg-muted text-muted-foreground border-border gap-1.5', className)}
        >
          <CloudOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
          <span>Local (Ready to sync)</span>
        </Badge>
      );
  }
};
