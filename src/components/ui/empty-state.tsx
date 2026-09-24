import React from 'react';

export interface EmptyStateProps {
  message: string;
  /** Optional bold heading rendered above the message. */
  title?: string;
  /** Optional element rendered above the heading (icon or illustration). */
  icon?: React.ReactNode;
  /** Optional action region (e.g. a CTA button) rendered below the message. */
  action?: React.ReactNode;
}

/**
 * Shared empty-state primitive: a dashed-border, centered box.
 * Use across features so "nothing here yet" surfaces look consistent.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ message, title, icon, action }) => (
  <div className="flex flex-col items-center gap-3 text-center py-12 border-2 border-dashed border-border rounded-lg text-muted-foreground">
    {icon}
    {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
    <p className="max-w-sm mx-auto">{message}</p>
    {action}
  </div>
);
