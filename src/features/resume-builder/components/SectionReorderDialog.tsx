import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ResumeData } from '@/types/resume';
import { GripVertical, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SectionReorderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: ResumeData;
  onSave: (newOrder: { main: string[]; sidebar?: string[] }) => void;
}

const SECTION_LABELS: Record<string, string> = {
  education: 'Education',
  skills: 'Skills',
  work: 'Work Experience',
  projects: 'Projects',
  summary: 'Summary',
  contact: 'Contact Info',
  languages: 'Languages',
};

// Sortable Item Component
const SortableItem = ({
  id,
  isSidebar,
  isModern,
  onMoveToOther,
}: {
  id: string;
  isSidebar: boolean;
  isModern: boolean;
  onMoveToOther: (id: string, fromSidebar: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between p-3 mb-2 rounded-lg border bg-card text-card-foreground shadow-sm',
        isDragging && 'border-primary shadow-md',
        'hover:border-primary/50 transition-colors'
      )}
    >
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab hover:text-primary">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="font-medium text-sm">{SECTION_LABELS[id] || id}</span>
      </div>

      {isModern && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-primary z-50 relative"
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag interference
            onMoveToOther(id, isSidebar);
          }}
        >
          {isSidebar ? <ArrowRight className="h-3 w-3" /> : <ArrowLeft className="h-3 w-3" />}
        </Button>
      )}
    </div>
  );
};

const SectionReorderDialog: React.FC<SectionReorderDialogProps> = ({
  isOpen,
  onClose,
  data,
  onSave,
}) => {
  // Classic or single-column templates use only 'main'
  const isModern = data.meta?.template === 'modern' || data.meta?.template === 'creative';

  // Default Orders
  const defaultSidebar = ['education', 'skills', 'contact'];
  const defaultMain = ['summary', 'work', 'projects'];
  const defaultClassic = ['summary', 'work', 'projects', 'education', 'skills'];

  const [sidebarOrder, setSidebarOrder] = useState<string[]>([]);
  const [mainOrder, setMainOrder] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (isModern) {
        setSidebarOrder(data.meta?.sectionOrder?.sidebar || defaultSidebar);
        setMainOrder(data.meta?.sectionOrder?.main || defaultMain);
      } else {
        const currentOrder = data.meta?.sectionOrder?.main || [
          ...(data.meta?.sectionOrder?.sidebar || []),
          ...(data.meta?.sectionOrder?.main || []),
        ];

        if (currentOrder.length === 0) {
          setMainOrder(defaultClassic);
        } else {
          setMainOrder(Array.from(new Set(currentOrder)));
        }
        setSidebarOrder([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, data, isModern]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndMain = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = mainOrder.indexOf(String(active.id));
      const newIndex = mainOrder.indexOf(String(over.id));
      setMainOrder(arrayMove(mainOrder, oldIndex, newIndex));
    }
  };

  const handleDragEndSidebar = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sidebarOrder.indexOf(String(active.id));
      const newIndex = sidebarOrder.indexOf(String(over.id));
      setSidebarOrder(arrayMove(sidebarOrder, oldIndex, newIndex));
    }
  };

  const moveToOtherList = (id: string, fromSidebar: boolean) => {
    if (fromSidebar) {
      setSidebarOrder(sidebarOrder.filter((i) => i !== id));
      setMainOrder([...mainOrder, id]);
    } else {
      setMainOrder(mainOrder.filter((i) => i !== id));
      setSidebarOrder([...sidebarOrder, id]);
    }
  };

  const handleSave = () => {
    onSave({
      main: mainOrder,
      sidebar: sidebarOrder.length > 0 ? sidebarOrder : undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Customize Resume Layout</DialogTitle>
          <DialogDescription>
            Drag and drop to reorder sections. Use arrows to move between columns.
          </DialogDescription>
        </DialogHeader>

        <div className={cn('grid gap-4 py-4', isModern ? 'grid-cols-2' : 'grid-cols-1')}>
          {isModern && (
            <div className="p-4 bg-muted/50 rounded-xl border border-border">
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider flex justify-between">
                <span>Sidebar</span>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">
                  {sidebarOrder.length}
                </span>
              </h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndSidebar}
              >
                <SortableContext items={sidebarOrder} strategy={verticalListSortingStrategy}>
                  {sidebarOrder.map((id) => (
                    <SortableItem
                      key={id}
                      id={id}
                      isSidebar={true}
                      isModern={isModern}
                      onMoveToOther={moveToOtherList}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {sidebarOrder.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-4 border-2 border-dashed rounded-lg border-muted">
                  Empty Column
                </p>
              )}
            </div>
          )}

          <div className="p-4 bg-muted/50 rounded-xl border border-border">
            <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider flex justify-between">
              <span>{isModern ? 'Main Content' : 'Sections'}</span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">
                {mainOrder.length}
              </span>
            </h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndMain}
            >
              <SortableContext items={mainOrder} strategy={verticalListSortingStrategy}>
                {mainOrder.map((id) => (
                  <SortableItem
                    key={id}
                    id={id}
                    isSidebar={false}
                    isModern={isModern}
                    onMoveToOther={moveToOtherList}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {mainOrder.length === 0 && (
              <p className="text-xs text-muted-foreground italic text-center py-4 border-2 border-dashed rounded-lg border-muted">
                Empty Column
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Layout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SectionReorderDialog;
