import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Project } from '@/types/resume';
import { GridField, useSectionAnalysis } from './entry-list.shared';
import { GenericSectionForm } from './GenericSectionForm';

interface ProjectsFormProps {
  data: Project[];
  onChange: (data: Project[]) => void;
}

const defaultEntry: Project = { name: '', description: '' };

const ProjectsForm: React.FC<ProjectsFormProps> = ({ data, onChange }) => {
  const { handleAnalyze } = useSectionAnalysis<Project>('Project Entry');

  const validate = (entry: Project) => {
    if (!entry.description) return 'Please add a description to analyze.';
    return null;
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
      onAnalyze={(idx, entry, setIdx) => handleAnalyze(idx, entry, setIdx, validate)}
      analyzeTooltip="AI Check"
      renderFields={(entry, handleChange) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GridField label="Project Name">
              <Input
                value={entry.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </GridField>
            <GridField label="URL / Link">
              <Input
                value={entry.url || ''}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://..."
              />
            </GridField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GridField label="Start Date">
              <Input
                value={entry.startDate || ''}
                onChange={(e) => handleChange('startDate', e.target.value)}
                placeholder="YYYY-MM"
              />
            </GridField>
            <GridField label="End Date">
              <Input
                value={entry.endDate || ''}
                onChange={(e) => handleChange('endDate', e.target.value)}
                placeholder="YYYY-MM or Present"
              />
            </GridField>
          </div>

          <GridField label="Description">
            <Textarea
              value={entry.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </GridField>
        </>
      )}
    />
  );
};

export default ProjectsForm;
