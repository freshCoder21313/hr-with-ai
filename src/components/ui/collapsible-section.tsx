import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
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

  return (
    <div className={cn('border rounded-lg bg-white shadow-sm overflow-hidden', className)}>
      <div
        className={cn(
          'flex items-center justify-between p-4 bg-slate-50 border-b cursor-pointer hover:bg-slate-100 transition-colors',
          headerClassName
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="font-bold text-lg text-slate-800 flex-1">{title}</div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
      </div>
      {isOpen && <div className={cn('p-4', contentClassName)}>{children}</div>}
    </div>
  );
};
