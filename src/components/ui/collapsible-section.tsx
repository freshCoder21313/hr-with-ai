import React, { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  /** Rendered inside the toggle `<button>`, so keep it phrasing content (text, spans, icons). */
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
  className,
  headerClassName,
  contentClassName,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div
      className={cn('border rounded-lg bg-card shadow-sm overflow-hidden border-border', className)}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        // Content is unmounted while collapsed, so only reference it when it exists.
        aria-controls={isOpen ? contentId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'flex w-full items-center justify-between gap-2 p-4 text-left bg-muted/50 border-b border-border cursor-pointer hover:bg-muted/80 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          headerClassName
        )}
      >
        <span className="block font-bold text-lg text-foreground flex-1">{title}</span>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground"
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {isOpen && (
        <div id={contentId} className={cn('p-4', contentClassName)}>
          {children}
        </div>
      )}
    </div>
  );
};
