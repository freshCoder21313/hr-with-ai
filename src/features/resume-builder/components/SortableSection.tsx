import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableSectionProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export const SortableSection: React.FC<SortableSectionProps> = ({ id, children, className }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn('relative group', className)}>
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab hover:text-blue-500 text-slate-400 z-10 print:hidden p-1 rounded backdrop-blur-sm"
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </div>
      {children}
    </div>
  );
};
