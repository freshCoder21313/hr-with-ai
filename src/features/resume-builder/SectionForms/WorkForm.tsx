import React from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Work } from '@/types/resume';
import { analyzeResumeSection } from '@/services/resume/resumeAIService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import {
  useEntryList,
  EntryCardActions,
  EntryCardShell,
  EntryListHeader,
  EmptyState,
  GridField,
} from './entry-list.shared';

interface WorkFormProps {
  data: Work[];
  onChange: (data: Work[]) => void;
}

const defaultEntry: Work = { name: '', position: '', summary: '' };

const WorkForm: React.FC<WorkFormProps> = ({ data, onChange }) => {
  const { analyzingIndex, setAnalyzingIndex, handleAdd, handleRemove, handleChange } =
    useEntryList(data, onChange);

  const handleAnalyze = async (index: number) => {
    const entry = data[index];
    if (!entry.summary && (!entry.highlights || entry.highlights.length === 0)) {
      toast.error('Please add some content (Summary or Highlights) to analyze.');
      return;
    }
    const config = getStoredAIConfig();
    if (!config.apiKey) {
      toast.error('Please set API Key in settings.');
      return;
    }

    setAnalyzingIndex(index);
    try {
      const result = await analyzeResumeSection('Work Experience Entry', entry, config);
      toast.info(`AI Critique:\n${result.critique}\n\nRewritten Example:\n${result.rewrittenExample}`, { duration: 8000 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Analysis failed';
      toast.error('Analysis failed: ' + msg);
    } finally {
      setAnalyzingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <EntryListHeader
        title="Work Experience"
        addLabel="Add Job"
        onAdd={() => handleAdd(defaultEntry)}
      />

      {data.map((entry, index) => (
        <EntryCardShell key={index} title={entry.name || '(New Position)'}>
          <EntryCardActions
            analyzingIndex={analyzingIndex}
            index={index}
            onAnalyze={handleAnalyze}
            onRemove={(i) => confirm('Remove this work entry?') && handleRemove(i)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GridField label="Company Name">
              <Input value={entry.name || ''} onChange={(e) => handleChange(index, 'name', e.target.value)} />
            </GridField>
            <GridField label="Position / Title">
              <Input value={entry.position || ''} onChange={(e) => handleChange(index, 'position', e.target.value)} />
            </GridField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GridField label="Start Date">
              <Input value={entry.startDate || ''} onChange={(e) => handleChange(index, 'startDate', e.target.value)} placeholder="YYYY-MM" />
            </GridField>
            <GridField label="End Date">
              <Input value={entry.endDate || ''} onChange={(e) => handleChange(index, 'endDate', e.target.value)} placeholder="YYYY-MM or Present" />
            </GridField>
          </div>

          <GridField label="Summary / Description">
            <Textarea value={entry.summary || ''} onChange={(e) => handleChange(index, 'summary', e.target.value)} rows={3} />
          </GridField>
        </EntryCardShell>
      ))}

      {data.length === 0 && <EmptyState message="No work experience added yet. Click &quot;Add Job&quot; to start." />}
    </div>
  );
};

export default WorkForm;
