import React from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Education } from '@/types/resume';
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

interface EducationFormProps {
  data: Education[];
  onChange: (data: Education[]) => void;
}

const defaultEntry: Education = {
  institution: '', area: '', studyType: '', startDate: '', endDate: '',
};

const EducationForm: React.FC<EducationFormProps> = ({ data, onChange }) => {
  const { analyzingIndex, setAnalyzingIndex, handleAdd, handleRemove, handleChange } =
    useEntryList(data, onChange);

  const handleAnalyze = async (index: number) => {
    const entry = data[index];
    const config = getStoredAIConfig();
    if (!config.apiKey) {
      toast.error('Please set API Key in settings.');
      return;
    }

    setAnalyzingIndex(index);
    try {
      const result = await analyzeResumeSection('Education Entry', entry, config);
      toast.info(`AI Critique:\n${result.critique}\n\nSuggestion:\n${result.suggestions.join('\n- ')}`, { duration: 8000 });
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
        title="Education"
        addLabel="Add Education"
        onAdd={() => handleAdd(defaultEntry)}
      />

      {data.map((entry, index) => (
        <EntryCardShell key={index} title={entry.institution || '(New School)'}>
          <EntryCardActions
            analyzingIndex={analyzingIndex}
            index={index}
            onAnalyze={handleAnalyze}
            onRemove={(i) => confirm('Remove this education entry?') && handleRemove(i)}
            analyzeTooltip="AI Check"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GridField label="Institution / School">
              <Input value={entry.institution || ''} onChange={(e) => handleChange(index, 'institution', e.target.value)} />
            </GridField>
            <GridField label="Degree / Study Type">
              <Input value={entry.studyType || ''} onChange={(e) => handleChange(index, 'studyType', e.target.value)} placeholder="e.g. Bachelor of Science" />
            </GridField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GridField label="Area / Major">
              <Input value={entry.area || ''} onChange={(e) => handleChange(index, 'area', e.target.value)} placeholder="e.g. Computer Science" />
            </GridField>
            <GridField label="GPA / Score (Optional)">
              <Input value={entry.score || ''} onChange={(e) => handleChange(index, 'score', e.target.value)} />
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
        </EntryCardShell>
      ))}

      {data.length === 0 && <EmptyState message="No education history added yet." />}
    </div>
  );
};

export default EducationForm;
