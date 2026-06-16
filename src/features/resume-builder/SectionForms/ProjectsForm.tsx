import React from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Project } from '@/types/resume';
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

interface ProjectsFormProps {
  data: Project[];
  onChange: (data: Project[]) => void;
}

const defaultEntry: Project = { name: '', description: '' };

const ProjectsForm: React.FC<ProjectsFormProps> = ({ data, onChange }) => {
  const { analyzingIndex, setAnalyzingIndex, handleAdd, handleRemove, handleChange } =
    useEntryList(data, onChange);

  const handleAnalyze = async (index: number) => {
    const entry = data[index];
    if (!entry.description) {
      toast.error('Please add a description to analyze.');
      return;
    }
    const config = getStoredAIConfig();
    if (!config.apiKey) {
      toast.error('Please set API Key in settings.');
      return;
    }

    setAnalyzingIndex(index);
    try {
      const result = await analyzeResumeSection('Project Entry', entry, config);
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
        title="Projects"
        addLabel="Add Project"
        onAdd={() => handleAdd(defaultEntry)}
      />

      {data.map((entry, index) => (
        <EntryCardShell key={index} title={entry.name || '(New Project)'}>
          <EntryCardActions
            analyzingIndex={analyzingIndex}
            index={index}
            onAnalyze={handleAnalyze}
            onRemove={(i) => confirm('Remove this project?') && handleRemove(i)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GridField label="Project Name">
              <Input value={entry.name || ''} onChange={(e) => handleChange(index, 'name', e.target.value)} />
            </GridField>
            <GridField label="URL / Link">
              <Input value={entry.url || ''} onChange={(e) => handleChange(index, 'url', e.target.value)} placeholder="https://..." />
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

          <GridField label="Description">
            <Textarea value={entry.description || ''} onChange={(e) => handleChange(index, 'description', e.target.value)} rows={3} />
          </GridField>
        </EntryCardShell>
      ))}

      {data.length === 0 && <EmptyState message="No projects added yet." />}
    </div>
  );
};

export default ProjectsForm;
