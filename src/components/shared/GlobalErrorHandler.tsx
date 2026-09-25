import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { openApiKeyModal } from '@/events/apiKeyEvents';
export function GlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();

      const message =
        event.reason instanceof Error ? event.reason.message : 'An unexpected error occurred';

      const isAuthOrQuota = /api key|401|403|unauthorized|quota/i.test(message);
      toast.error('Operation failed', {
        description: message,
        action: isAuthOrQuota
          ? {
              label: 'Open Settings',
              onClick: () => openApiKeyModal(),
            }
          : {
              label: 'Reload',
              onClick: () => window.location.reload(),
            },
      });
    };

    const handleError = (event: ErrorEvent) => {
      logger.error('Global error:', event.error);

      const message =
        event.error instanceof Error ? event.error.message : 'An unexpected error occurred';

      const isAuthOrQuota = /api key|401|403|unauthorized|quota/i.test(message);
      toast.error('Something went wrong', {
        description: message,
        action: isAuthOrQuota
          ? {
              label: 'Open Settings',
              onClick: () => openApiKeyModal(),
            }
          : {
              label: 'Reload',
              onClick: () => window.location.reload(),
            },
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}

export default GlobalErrorHandler;
