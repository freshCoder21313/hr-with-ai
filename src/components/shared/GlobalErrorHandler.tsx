import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export function GlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();

      const message =
        event.reason instanceof Error ? event.reason.message : 'An unexpected error occurred';

      toast.error('Operation failed', {
        description: message,
      });
    };

    const handleError = (event: ErrorEvent) => {
      logger.error('Global error:', event.error);

      const message =
        event.error instanceof Error ? event.error.message : 'An unexpected error occurred';

      toast.error('Something went wrong', {
        description: message,
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
