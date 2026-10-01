import React, { useCallback } from 'react';
import { AlertCircle, X, RefreshCw, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import { useInterviewStore } from '@/features/interview/interviewStore';
import { Button } from '@/components/ui/button';

interface InterviewErrorBannerProps {
  /** Supplied by `useInterview`; omitted where the transcript cannot be retried. */
  onRetry?: () => void | Promise<void>;
  /**
   * Set where the banner is mounted on a permanently dark surface (the voice
   * room gradient). The default light-theme `--foreground` is near-black
   * there and unreadable, so this swaps in scoped light tokens.
   */
  onDark?: boolean;
}

/**
 * Renders the interview store's runtime `error`.
 *
 * Deliberately distinct from the loader error in `InterviewRoom`, which
 * replaces the whole room: a loader failure means the transcript is unusable,
 * whereas a store error is an incident inside a still-usable room that the
 * user must be able to act on and then dismiss.
 */
export const InterviewErrorBanner: React.FC<InterviewErrorBannerProps> = ({
  onRetry,
  onDark = false,
}) => {
  const error = useInterviewStore((state) => state.error);
  const setError = useInterviewStore((state) => state.setError);
  const lastMessage = useInterviewStore((state) => state.currentInterview?.messages.at(-1));

  const dismiss = useCallback(() => setError(null), [setError]);

  if (!error) return null;

  const isConfigError = /api\s*key|not\s+configured/i.test(error);
  // Retry is a no-op unless the transcript's tail is an undelivered model turn,
  // so do not offer an action that would do nothing.
  const canRetry =
    !!onRetry && lastMessage?.role === 'model' && (!!lastMessage.isError || !lastMessage.content);

  const actionClass = cn(
    'gap-1.5',
    onDark && 'border-white/25 bg-transparent text-white hover:bg-white/10'
  );

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'mx-4 mt-3 flex shrink-0 items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        onDark ? 'border-red-400/40 bg-red-500/15' : 'border-destructive/40 bg-destructive/10'
      )}
    >
      <AlertCircle
        className={cn('mt-0.5 h-4 w-4 shrink-0', onDark ? 'text-red-300' : 'text-destructive')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium', onDark ? 'text-white' : 'text-foreground')}>
          Something went wrong
        </p>
        <p
          className={cn('mt-0.5 break-words', onDark ? 'text-slate-200' : 'text-muted-foreground')}
        >
          {error}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isConfigError && (
          <Button
            variant="outline"
            size="sm"
            className={actionClass}
            onClick={() => {
              setError(null);
              openApiKeyModal();
            }}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Configure
          </Button>
        )}
        {canRetry && (
          <Button
            variant="outline"
            size="sm"
            className={actionClass}
            onClick={() => {
              setError(null);
              void onRetry?.();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss error"
          onClick={dismiss}
          className={onDark ? 'text-slate-200 hover:bg-white/10 hover:text-white' : undefined}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
