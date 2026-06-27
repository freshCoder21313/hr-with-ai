import { toast } from 'sonner';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

interface QueuedConfirm {
  options: ConfirmationOptions;
  resolve: (value: boolean) => void;
}

class NotificationService {
  private static instance: NotificationService;
  private confirmResolver: ((value: boolean) => void) | null = null;
  private confirmOptions: ConfirmationOptions | null = null;
  private confirmQueue: QueuedConfirm[] = [];
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

  public confirm(options: ConfirmationOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmQueue.push({ options, resolve });
      this.processConfirmQueue();
    });
  }

  private processConfirmQueue() {
    if (this.confirmResolver || this.confirmQueue.length === 0) return;

    const next = this.confirmQueue.shift()!;
    this.confirmOptions = next.options;
    this.confirmResolver = next.resolve;
    if (this.onConfirmChange) {
      this.onConfirmChange(next.options);
    }
  }

  public _subscribeToConfirm(callback: (options: ConfirmationOptions | null) => void) {
    this.onConfirmChange = callback;
  }

  public _resolveConfirm(value: boolean) {
    if (this.confirmResolver) {
      this.confirmResolver(value);
      this.confirmResolver = null;
      this.confirmOptions = null;
      if (this.onConfirmChange) {
        this.onConfirmChange(null);
      }
      this.processConfirmQueue();
    }
  }
}

export const notificationService = NotificationService.getInstance();