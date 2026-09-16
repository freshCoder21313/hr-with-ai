import React from 'react';
import {
  Wand2,
  ChevronLeft,
  Save,
  Eye,
  Columns,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { cn } from '@/lib/utils';
import { Resume } from '@/types';

interface BuilderHeaderProps {
  resume: Resume;
  viewMode: 'editor' | 'preview' | 'split';
  isProcessing: boolean;
  onBack: () => void;
  onViewModeChange: (mode: 'editor' | 'preview' | 'split') => void;
  onSmartFormat: () => void;
  onSave: () => void;
}

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({
  resume,
  viewMode,
  isProcessing,
  onBack,
  onViewModeChange,
  onSmartFormat,
  onSave,
}) => {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0 gap-4 print:hidden">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="font-bold text-lg text-foreground truncate" title={resume.fileName}>
          {resume.fileName}
        </h1>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <div className="flex bg-muted p-1 rounded-lg mr-2 tour-preview-toggle">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewModeChange('editor')}
            className={cn(
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
              viewMode === 'preview'
                ? 'bg-background shadow-sm hover:bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            <Eye className="w-4 h-4 mr-2" /> Preview
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewModeChange('split')}
            className={cn(
              viewMode === 'split'
                ? 'bg-background shadow-sm hover:bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            <Columns className="w-4 h-4 mr-2" /> Split
          </Button>
        </div>

        {!resume.formatted && viewMode === 'editor' && (
          <LoadingButton
            onClick={onSmartFormat}
            disabled={isProcessing}
            isLoading={isProcessing}
            loadingText=""
            className="bg-purple-600 hover:bg-purple-700 text-white"
            leftIcon={<Wand2 className="w-4 h-4" />}
          >
            Smart Format
          </LoadingButton>
        )}

        <Button onClick={onSave} className="gap-2">
          <Save className="w-4 h-4" /> Save
        </Button>
      </div>
    </header>
  );
};
