import { toast } from 'sonner';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

class NotificationService {
  private static instance: NotificationService;
  private confirmResolver: ((value: boolean) => void) | null = null;
  private confirmOptions: ConfirmationOptions | null = null;
  private onConfirmChange: ((options: ConfirmationOptions | null) => void) | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public success(message: string) {
    toast.success(message);
  }

  public error(message: string, error?: unknown) {
    if (error) {
      console.error(`[NotificationService] Error: ${message}`, error);
    } else {
      console.error(`[NotificationService] Error: ${message}`);
    }
    toast.error(message);
  }

  public info(message: string) {
    toast.info(message);
  }

  public warning(message: string) {
    toast.warning(message);
  }

  /**
   * Triggers a confirmation modal.
   * Returns a promise that resolves to true (confirmed) or false (cancelled).
   */
  public confirm(options: ConfirmationOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmOptions = options;
      this.confirmResolver = resolve;
      if (this.onConfirmChange) {
        this.onConfirmChange(options);
      }
    });
  }

  // Internal: Hook for the provider to listen for confirmation requests
  public _subscribeToConfirm(callback: (options: ConfirmationOptions | null) => void) {
    this.onConfirmChange = callback;
  }

  // Internal: Called by the provider when user acts
  public _resolveConfirm(value: boolean) {
    if (this.confirmResolver) {
      this.confirmResolver(value);
      this.confirmResolver = null;
      this.confirmOptions = null;
      if (this.onConfirmChange) {
        this.onConfirmChange(null);
      }
    }
  }
}

export const notificationService = NotificationService.getInstance();
