import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { notificationService, ConfirmationOptions } from '@/services/core/notificationService';

const NotificationContext = createContext<typeof notificationService>(notificationService);

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [confirmOptions, setConfirmOptions] = useState<ConfirmationOptions | null>(null);

  useEffect(() => {
    // Subscribe to confirmation requests from the service
    notificationService._subscribeToConfirm((options) => {
      setConfirmOptions(options);
    });

    return () => {
      notificationService._subscribeToConfirm(() => {});
    };
  }, []);

  const handleConfirm = () => {
    notificationService._resolveConfirm(true);
  };

  const handleCancel = () => {
    notificationService._resolveConfirm(false);
  };

  return (
    <NotificationContext.Provider value={notificationService}>
      {children}
      {confirmOptions && (
        <ConfirmationDialog
          isOpen={!!confirmOptions}
          title={confirmOptions.title}
          description={confirmOptions.message}
          confirmText={confirmOptions.confirmLabel}
          cancelText={confirmOptions.cancelLabel}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isDestructive={confirmOptions.variant === 'destructive'}
        />
      )}
    </NotificationContext.Provider>
  );
};
