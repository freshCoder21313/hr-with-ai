import React from 'react';
import {
  Plus,
  Briefcase,
  GraduationCap,
  Code,
  FolderGit2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface QuickActionFabProps {
  onAddSection: (section: 'work' | 'education' | 'skills' | 'projects') => void;
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
}

const QuickActionFab: React.FC<QuickActionFabProps> = ({
  onAddSection,
  onScrollToTop,
  onScrollToBottom,
}) => {
  return (
    <div className="fixed bottom-[calc(2rem_+_var(--safe-bottom))] right-[calc(2rem_+_var(--safe-right))] z-50 flex flex-col gap-3">
      {/* Navigation Buttons */}
      <div className="flex flex-col gap-2 opacity-50 hover:opacity-100 transition-opacity">
        <Button
          size="icon-sm"
          variant="secondary"
          aria-label="Scroll to top"
          className="rounded-full shadow-sm"
          onClick={onScrollToTop}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="secondary"
          aria-label="Scroll to bottom"
          className="rounded-full shadow-sm"
          onClick={onScrollToBottom}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Main FAB */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            aria-label="Add section"
            className="h-14 w-14 md:h-14 md:w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-transform hover:scale-105"
          >
            <Plus className="h-6 w-6 text-primary-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56 p-2">
          <DropdownMenuItem
            onClick={() => onAddSection('work')}
            className="cursor-pointer gap-3 p-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Briefcase className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">Experience</span>
              <span className="text-xs text-muted-foreground">Add job history</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onAddSection('education')}
            className="cursor-pointer gap-3 p-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">Education</span>
              <span className="text-xs text-muted-foreground">Add school/degree</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onAddSection('skills')}
            className="cursor-pointer gap-3 p-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info/10 text-info">
              <Code className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">Skill</span>
              <span className="text-xs text-muted-foreground">Add technical skill</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onAddSection('projects')}
            className="cursor-pointer gap-3 p-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/10 text-warning">
              <FolderGit2 className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">Project</span>
              <span className="text-xs text-muted-foreground">Add side project</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default QuickActionFab;
