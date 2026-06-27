import React from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Project } from '@/types/resume';
import { analyzeResumeSection } from '@/services/resume/resumeAIService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { GridField } from './entry-list.shared';
import { GenericSectionForm } from './GenericSectionForm';

interface ProjectsFormProps {
  data: Project[];
  onChange: (data: Project[]) => void;
}

const defaultEntry: Project = { name: '', description: '' };

const ProjectsForm: React.FC<ProjectsFormProps> = ({ data, onChange }) => {
  const handleAnalyze = async (index: number, entry: Project, setAnalyzingIndex: (i: number | null) => void) => {
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
    <GenericSectionForm<Project>
      data={data}
      onChange={onChange}
      title="Projects"
      addLabel="Add Project"
      emptyMessage="No projects added yet."
      defaultEntry={defaultEntry}
      getTitle={(entry) => entry.name || '(New Project)'}
      onAnalyze={handleAnalyze}
      analyzeTooltip="AI Check"
      renderFields={(entry, handleChange) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GridField label="Project Name">
              <Input value={entry.name || ''} onChange={(e) => handleChange('name', e.target.value)} />
            </GridField>
            <GridField label="URL / Link">
              <Input value={entry.url || ''} onChange={(e) => handleChange('url', e.target.value)} placeholder="https://..." />
            </GridField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GridField label="Start Date">
              <Input value={entry.startDate || ''} onChange={(e) => handleChange('startDate', e.target.value)} placeholder="YYYY-MM" />
            </GridField>
            <GridField label="End Date">
              <Input value={entry.endDate || ''} onChange={(e) => handleChange('endDate', e.target.value)} placeholder="YYYY-MM or Present" />
            </GridField>
          </div>

          <GridField label="Description">
            <Textarea value={entry.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={3} />
          </GridField>
        </>
      )}
    />
  );
};

export default ProjectsForm;