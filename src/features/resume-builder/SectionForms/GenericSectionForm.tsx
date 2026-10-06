import React from 'react';
import { notificationService } from '@/services/core/notificationService';
import {
  useEntryList,
  EntryCardActions,
  EntryCardShell,
  EntryListHeader,
  EmptyState,
  getEntryKey,
} from './entry-list.shared';

interface GenericSectionFormProps<T> {
  data: T[];
  onChange: (data: T[]) => void;
  title: string;
  addLabel: string;
  emptyMessage: string;
  defaultEntry: T;
  getTitle: (entry: T) => string;
  getSubtitle?: (entry: T) => string;
  onAnalyze?: (
    index: number,
    entry: T,
    setAnalyzingIndex: (i: number | null) => void
  ) => Promise<void>;
  analyzeTooltip?: string;
  renderFields: (
    entry: T,
    handleChange: <K extends keyof T>(field: K, value: T[K]) => void
  ) => React.ReactNode;
}

export function GenericSectionForm<T>({
  data,
  onChange,
  title,
  addLabel,
  emptyMessage,
  defaultEntry,
  getTitle,
  getSubtitle,
  onAnalyze,
  analyzeTooltip,
  renderFields,
}: GenericSectionFormProps<T>) {
  const { analyzingIndex, setAnalyzingIndex, handleAdd, handleRemove, handleChange } = useEntryList(
    data,
    onChange
  );

  const [expandedIndices, setExpandedIndices] = React.useState<Set<number>>(() => new Set([0]));

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const allExpanded = data.length > 0 && expandedIndices.size === data.length;
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedIndices(new Set());
    } else {
      setExpandedIndices(new Set(data.map((_, i) => i)));
    }
  };

  const handleAddNew = () => {
    handleAdd(defaultEntry);
    setExpandedIndices((prev) => {
      const next = new Set<number>([0]);
      prev.forEach((idx) => next.add(idx + 1));
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    handleRemove(index);
    setExpandedIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      });
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <EntryListHeader
        title={title}
        addLabel={addLabel}
        onAdd={handleAddNew}
        count={data.length}
        allExpanded={allExpanded}
        onToggleAll={data.length > 1 ? toggleAll : undefined}
      />

      {data.map((entry, index) => (
        <EntryCardShell
          key={getEntryKey(entry as { _entryId?: string }, index)}
          title={getTitle(entry)}
          subtitle={getSubtitle ? getSubtitle(entry) : undefined}
          isExpanded={expandedIndices.has(index)}
          onToggleExpand={() => toggleExpand(index)}
          derivedFromFactIds={
            (entry as Record<string, unknown>).derivedFromFactIds as string[] | undefined
          }
          actions={
            <EntryCardActions
              analyzingIndex={analyzingIndex}
              index={index}
              onAnalyze={onAnalyze ? () => onAnalyze(index, entry, setAnalyzingIndex) : undefined}
              onRemove={async (i) => {
                const confirmed = await notificationService.confirm({
                  title: 'Remove Entry',
                  message: 'Remove this entry?',
                  variant: 'destructive',
                });
                if (confirmed) handleRemoveItem(i);
              }}
              analyzeTooltip={analyzeTooltip}
            />
          }
        >
          {renderFields(entry, (field, value) => handleChange(index, field, value))}
        </EntryCardShell>
      ))}

      {data.length === 0 && <EmptyState message={emptyMessage} />}
    </div>
  );
}
