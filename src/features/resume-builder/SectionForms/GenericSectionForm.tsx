import React from 'react';
import { notificationService } from '@/services/core/notificationService';
import {
  useEntryList,
  EntryCardActions,
  EntryCardShell,
  EntryListHeader,
  EmptyState,
} from './entry-list.shared';

interface GenericSectionFormProps<T> {
  data: T[];
  onChange: (data: T[]) => void;
  title: string;
  addLabel: string;
  emptyMessage: string;
  defaultEntry: T;
  getTitle: (entry: T) => string;
  onAnalyze?: (index: number, entry: T, setAnalyzingIndex: (i: number | null) => void) => Promise<void>;
  analyzeTooltip?: string;
  renderFields: (entry: T, handleChange: <K extends keyof T>(field: K, value: T[K]) => void) => React.ReactNode;
}

export function GenericSectionForm<T>({
  data,
  onChange,
  title,
  addLabel,
  emptyMessage,
  defaultEntry,
  getTitle,
  onAnalyze,
  analyzeTooltip,
  renderFields,
}: GenericSectionFormProps<T>) {
  const { analyzingIndex, setAnalyzingIndex, handleAdd, handleRemove, handleChange } =
    useEntryList(data, onChange);

  return (
    <div className="space-y-6">
      <EntryListHeader
        title={title}
        addLabel={addLabel}
        onAdd={() => handleAdd(defaultEntry)}
      />

      {data.map((entry, index) => (
        <EntryCardShell key={index} title={getTitle(entry)}>
          <EntryCardActions
            analyzingIndex={analyzingIndex}
            index={index}
            onAnalyze={onAnalyze ? () => onAnalyze(index, entry, setAnalyzingIndex) : () => {}}
            onRemove={async (i) => {
              const confirmed = await notificationService.confirm({
                title: 'Remove Entry',
                message: 'Remove this entry?',
                variant: 'destructive',
              });
              if (confirmed) handleRemove(i);
            }}
            analyzeTooltip={analyzeTooltip}
          />
          {renderFields(entry, (field, value) => handleChange(index, field, value))}
        </EntryCardShell>
      ))}

      {data.length === 0 && <EmptyState message={emptyMessage} />}
    </div>
  );
}