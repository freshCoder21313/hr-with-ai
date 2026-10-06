/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Trash2, Wand2, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createEntry, ensureEntryIds, getEntryKey, WithEntryId } from './entryIds';
import { analyzeResumeSection } from '@/services/resume/resumeAIService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
// Cross-feature import (career-knowledge modal reused in resume-builder).
// Lazy-loaded so the resume-builder bundle does not eagerly pull the
// career-knowledge service chain. Preloaded on hover/focus of the trigger so
// the first open does not stall on a chunk fetch; the Suspense fallback covers
// the residual race with a spinner instead of a blank modal.
const preloadAttributionModal = () =>
  import('@/features/career-knowledge/components/ResumeFactAttributionModal');
const ResumeFactAttributionModal = React.lazy(() =>
  preloadAttributionModal().then((m) => ({
    default: m.ResumeFactAttributionModal,
  }))
);

export function useEntryList<T>(data: T[], onChange: (data: T[]) => void) {
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);

  useEffect(() => {
    const entries = data as (T & { _entryId?: string })[];
    if (entries.some((entry) => !entry._entryId)) {
      onChange(ensureEntryIds(entries) as T[]);
    }
  }, [data, onChange]);

  const handleAdd = (defaultEntry: T) => {
    onChange([createEntry(defaultEntry) as T, ...data]);
  };

  const handleRemove = (index: number) => {
    const newData = [...data];
    newData.splice(index, 1);
    onChange(newData);
  };

  const handleChange = <K extends keyof T>(index: number, field: K, value: T[K]) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    onChange(newData);
  };

  return { analyzingIndex, setAnalyzingIndex, handleAdd, handleRemove, handleChange };
}

/**
 * Shared hook for AI-powered resume section analysis
 */
export function useSectionAnalysis<T>(sectionName: string) {
  const handleAnalyze = async (
    index: number,
    entry: T,
    setAnalyzingIndex: (i: number | null) => void,
    validate?: (entry: T) => string | null
  ) => {
    // Optional validation check
    if (validate) {
      const error = validate(entry);
      if (error) {
        toast.error(error);
        return;
      }
    }

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      toast.error('Please set API Key in settings.');
      return;
    }

    setAnalyzingIndex(index);
    try {
      const result = await analyzeResumeSection(sectionName, entry, config);

      let message = `AI Critique:\n${result.critique}`;

      if (result.rewrittenExample) {
        message += `\n\nRewritten Example:\n${result.rewrittenExample}`;
      }

      if (result.suggestions && result.suggestions.length > 0) {
        message += `\n\nSuggestions:\n- ${result.suggestions.join('\n- ')}`;
      }

      toast.info(message, { duration: 8000 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Analysis failed';
      toast.error('Analysis failed: ' + msg);
    } finally {
      setAnalyzingIndex(null);
    }
  };

  return { handleAnalyze };
}

interface EntryCardActionsProps {
  analyzingIndex: number | null;
  index: number;
  onAnalyze?: (index: number) => void;
  onRemove: (index: number) => void;
  analyzeTooltip?: string;
}

export const EntryCardActions: React.FC<EntryCardActionsProps> = ({
  analyzingIndex,
  index,
  onAnalyze,
  onRemove,
  analyzeTooltip = 'AI Roast & Fix',
}) => (
  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
    {onAnalyze && (
      <Tooltip>
        <TooltipTrigger asChild>
          <LoadingButton
            variant="outline"
            size="sm"
            onClick={() => onAnalyze(index)}
            disabled={analyzingIndex === index}
            isLoading={analyzingIndex === index}
            loadingText=""
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <Wand2 className="w-4 h-4" />
          </LoadingButton>
        </TooltipTrigger>
        <TooltipContent>
          <p>{analyzeTooltip}</p>
        </TooltipContent>
      </Tooltip>
    )}
    <Button variant="destructive" size="sm" onClick={() => onRemove(index)}>
      <Trash2 className="w-4 h-4" />
    </Button>
  </div>
);

interface EntryCardShellProps {
  title: string;
  children: React.ReactNode;
  derivedFromFactIds?: string[];
}

export const EntryCardShell: React.FC<EntryCardShellProps> = ({
  title,
  children,
  derivedFromFactIds,
}) => {
  const [isAttributionOpen, setIsAttributionOpen] = useState(false);
  const hasAttribution = Array.isArray(derivedFromFactIds) && derivedFromFactIds.length > 0;

  return (
    <>
      <Card className="relative group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span>{title}</span>
            {hasAttribution && (
              <button
                type="button"
                onClick={() => setIsAttributionOpen(true)}
                onMouseEnter={preloadAttributionModal}
                onFocus={preloadAttributionModal}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                title="View canonical Career Knowledge provenance"
              >
                <BookOpen className="w-3 h-3" />
                <span>From Career Knowledge</span>
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>

      {hasAttribution && isAttributionOpen && (
        <React.Suspense
          fallback={
            <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading provenance…
            </div>
          }
        >
          <ResumeFactAttributionModal
            factIds={derivedFromFactIds ?? []}
            isOpen={isAttributionOpen}
            onClose={() => setIsAttributionOpen(false)}
          />
        </React.Suspense>
      )}
    </>
  );
};

interface EntryListHeaderProps {
  title: string;
  addLabel: string;
  onAdd: () => void;
}

export const EntryListHeader: React.FC<EntryListHeaderProps> = ({ title, addLabel, onAdd }) => (
  <div className="flex justify-between items-center">
    <h2 className="text-xl font-bold text-foreground">{title}</h2>
    <Button onClick={onAdd} size="sm" className="gap-2">
      <Plus className="w-4 h-4" /> {addLabel}
    </Button>
  </div>
);

export { EmptyState } from '@/components/ui/empty-state';

interface GridFieldProps {
  label: string;
  children: React.ReactNode;
}

export const GridField: React.FC<GridFieldProps> = ({ label, children }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);

export type { WithEntryId };
export { getEntryKey };
