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
          className={cn(
            'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 gap-1.5',
            className
          )}
        >
          <CheckCircle2
            className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
            aria-hidden="true"
          />
          <span>Synced</span>
        </Badge>
      );
    case 'syncing':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 gap-1.5',
            className
          )}
        >
          <RefreshCw
            className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0"
            aria-hidden="true"
          />
          <span>Syncing...</span>
        </Badge>
      );
    case 'retryable_error':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 gap-1.5',
            className
          )}
        >
          <AlertTriangle
            className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0"
            aria-hidden="true"
          />
          <span>Temporary Network Issue (Retryable)</span>
        </Badge>
      );
    case 'auth_failure':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 gap-1.5',
            className
          )}
        >
          <Lock
            className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0"
            aria-hidden="true"
          />
          <span>Authentication Required</span>
        </Badge>
      );
    case 'authorization_failure':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 gap-1.5',
            className
          )}
        >
          <Lock
            className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0"
            aria-hidden="true"
          />
          <span>Profile Not Available</span>
        </Badge>
      );
    case 'conflict':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 gap-1.5',
            className
          )}
        >
          <AlertTriangle
            className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0"
            aria-hidden="true"
          />
          <span>Cloud Version Conflict</span>
        </Badge>
      );
    case 'schema_mismatch':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 gap-1.5',
            className
          )}
        >
          <FileWarning
            className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0"
            aria-hidden="true"
          />
          <span>Incompatible Version</span>
        </Badge>
      );
    case 'unknown_outcome':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800 gap-1.5',
            className
          )}
        >
          <HelpCircle
            className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0"
            aria-hidden="true"
          />
          <span>Outcome Unconfirmed (Safe to retry)</span>
        </Badge>
      );
    case 'non_retryable_error':
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 gap-1.5',
            className
          )}
        >
          <XCircle
            className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0"
            aria-hidden="true"
          />
          <span>Sync Error</span>
        </Badge>
      );
    case 'idle':
    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            'bg-slate-50 text-slate-600 border-slate-300 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800 gap-1.5',
            className
          )}
        >
          <CloudOff className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          <span>Local (Ready to sync)</span>
        </Badge>
      );
  }
};
