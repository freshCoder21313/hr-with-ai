/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { createEntry, ensureEntryIds, getEntryKey, WithEntryId } from './entryIds';

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
}

export const EntryCardShell: React.FC<EntryCardShellProps> = ({ title, children }) => (
  <Card className="relative group">
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);

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

interface EmptyStateProps {
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message }) => (
  <div className="text-center py-12 border-2 border-dashed border-border rounded-lg text-muted-foreground">
    {message}
  </div>
);

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
