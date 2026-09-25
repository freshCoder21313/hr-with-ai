import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SyncStatusBannerProps {
  error: string | null;
  success: string | null;
  onDismiss?: () => void;
}
export const SyncStatusBanner: React.FC<SyncStatusBannerProps> = ({ error, success, onDismiss }) => {
  return (
    <>
      {error && (
        <div className="mb-2 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-1.5 bg-destructive/20 rounded-full">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </div>
          <div className="text-sm text-destructive leading-tight">
            <p className="font-bold mb-0.5">Sync Error</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-emerald-500/20 rounded-full">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-sm text-emerald-800 dark:text-emerald-200 leading-tight">
              <p className="font-bold mb-0.5">Success</p>
              <p className="opacity-90">{success}</p>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20 shrink-0"
              onClick={onDismiss}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </>
  );
};
