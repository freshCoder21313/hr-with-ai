import React from 'react';
import { Plus, LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
  icon?: LucideIcon;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  onAdd,
  addLabel = 'Add',
  icon: Icon = Plus,
  className,
}) => {
  return (
    <div
      className={cn('flex items-center justify-between mb-4', className)}
      data-testid="section-header"
    >
      <h3 className="text-xl font-semibold">{title}</h3>
      {onAdd && (
        <Button onClick={onAdd} variant="outline" size="sm" className="gap-2">
          <Icon className="w-4 h-4" />
          {addLabel}
        </Button>
      )}
    </div>
  );
};
