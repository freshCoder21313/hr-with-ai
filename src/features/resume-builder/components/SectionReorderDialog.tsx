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
import { ArrowUp, ArrowDown, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const SectionReorderDialog: React.FC<SectionReorderDialogProps> = ({
  isOpen,
  onClose,
  data,
  onSave,
}) => {
  const isModern = data.meta?.template === 'modern';
  
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
        // Classic uses only main, but we might want to consolidate everything there
        const currentOrder = 
          data.meta?.sectionOrder?.main || 
          [...(data.meta?.sectionOrder?.sidebar || []), ...(data.meta?.sectionOrder?.main || [])];
        
        // Ensure we have defaults if empty
        if (currentOrder.length === 0) {
           setMainOrder(defaultClassic);
        } else {
           // Filter unique
           setMainOrder(Array.from(new Set(currentOrder)));
        }
        setSidebarOrder([]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, data, isModern]);

  const moveItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    direction: 'up' | 'down'
  ) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === list.length - 1) return;

    const newList = [...list];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    setList(newList);
  };

  const moveBetweenLists = (
    item: string,
    fromList: string[],
    setFromList: React.Dispatch<React.SetStateAction<string[]>>,
    toList: string[],
    setToList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setFromList(fromList.filter((i) => i !== item));
    setToList([...toList, item]);
  };

  const handleSave = () => {
    onSave({
      main: mainOrder,
      sidebar: sidebarOrder.length > 0 ? sidebarOrder : undefined,
    });
    onClose();
  };

  const renderItem = (
    item: string,
    index: number,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    isSidebar: boolean
  ) => (
    <div
      key={item}
      className={cn(
        "flex items-center justify-between p-3 mb-2 rounded-lg border bg-card text-card-foreground shadow-sm",
        "hover:border-primary/50 transition-colors"
      )}
    >
      <span className="font-medium text-sm">{SECTION_LABELS[item] || item}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => moveItem(list, setList, index, 'up')}
          disabled={index === 0}
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => moveItem(list, setList, index, 'down')}
          disabled={index === list.length - 1}
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
        
        {isModern && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-2 text-muted-foreground hover:text-primary"
            onClick={() => {
              if (isSidebar) {
                moveBetweenLists(item, sidebarOrder, setSidebarOrder, mainOrder, setMainOrder);
              } else {
                moveBetweenLists(item, mainOrder, setMainOrder, sidebarOrder, setSidebarOrder);
              }
            }}
          >
             {isSidebar ? <ArrowRight className="h-3 w-3" /> : <ArrowLeft className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Customize Resume Layout</DialogTitle>
          <DialogDescription>
            Reorder sections or move them between columns.
          </DialogDescription>
        </DialogHeader>

        <div className={cn("grid gap-4 py-4", isModern ? "grid-cols-2" : "grid-cols-1")}>
          {isModern && (
            <div className="p-4 bg-muted/50 rounded-xl border border-border">
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">Sidebar (Left)</h3>
              {sidebarOrder.map((item, i) => renderItem(item, i, sidebarOrder, setSidebarOrder, true))}
              {sidebarOrder.length === 0 && (
                 <p className="text-xs text-muted-foreground italic text-center py-4">Empty</p>
              )}
            </div>
          )}

          <div className="p-4 bg-muted/50 rounded-xl border border-border">
            <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">
               {isModern ? "Main Content (Right)" : "Main Content"}
            </h3>
            {mainOrder.map((item, i) => renderItem(item, i, mainOrder, setMainOrder, false))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Layout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SectionReorderDialog;
