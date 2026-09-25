import React from 'react';
import {
  Wand2,
  ChevronLeft,
  Save,
  Eye,
  Columns,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { cn } from '@/lib/utils';
import { Resume } from '@/types';

interface BuilderHeaderProps {
  resume: Resume;
  viewMode: 'editor' | 'preview' | 'split';
  isProcessing: boolean;
  isSaving?: boolean;
  onBack: () => void;
  onViewModeChange: (mode: 'editor' | 'preview' | 'split') => void;
  onSmartFormat: () => void;
  onSave: () => void;
}

const BuilderHeaderBase: React.FC<BuilderHeaderProps> = ({
  resume,
  viewMode,
  isProcessing,
  isSaving = false,
  onBack,
  onViewModeChange,
  onSmartFormat,
  onSave,
}) => {
  return (
    <header className="h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2 sm:gap-4 print:hidden">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 max-w-[40%] sm:max-w-none">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0 h-8 px-2 sm:h-9 sm:px-3 text-xs sm:text-sm"
        >
          <ChevronLeft className="w-4 h-4 mr-0.5 sm:mr-1" /> Back
        </Button>
        <h1 className="font-bold text-sm sm:text-lg text-foreground truncate" title={resume.fileName}>
          {resume.fileName}
        </h1>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap justify-end">
        <div className="flex bg-muted p-0.5 sm:p-1 rounded-lg tour-preview-toggle">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewModeChange('editor')}
            className={cn(
              'h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm',
              viewMode === 'editor'
                ? 'bg-background shadow-sm hover:bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            Editor
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewModeChange('preview')}
            className={cn(
              'h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm',
              viewMode === 'preview'
                ? 'bg-background shadow-sm hover:bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Preview
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewModeChange('split')}
            className={cn(
              'hidden sm:inline-flex h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm',
              viewMode === 'split'
                ? 'bg-background shadow-sm hover:bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            <Columns className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Split
          </Button>
        </div>

        {!resume.formatted && viewMode === 'editor' && (
          <LoadingButton
            onClick={onSmartFormat}
            disabled={isProcessing}
            isLoading={isProcessing}
            loadingText=""
            className="h-8 px-2 sm:h-9 sm:px-3 text-xs sm:text-sm bg-accent text-accent-foreground hover:bg-accent/80"
            leftIcon={<Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          >
            Smart Format
          </LoadingButton>
        )}

        <span
          className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground"
          title="Changes are saved automatically"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              <span>Saving…</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Saved</span>
            </>
          )}
        </span>

        <Button onClick={onSave} className="h-8 px-2.5 sm:h-9 sm:px-4 text-xs sm:text-sm gap-1 sm:gap-2">
          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Save
        </Button>
      </div>
    </header>
  );
};

export const BuilderHeader = React.memo(BuilderHeaderBase);
