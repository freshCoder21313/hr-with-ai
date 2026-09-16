import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Work } from '@/types/resume';
import { GridField, useSectionAnalysis } from './entry-list.shared';
import { GenericSectionForm } from './GenericSectionForm';

interface WorkFormProps {
  data: Work[];
  onChange: (data: Work[]) => void;
}

const defaultEntry: Work = { name: '', position: '', summary: '' };

const WorkForm: React.FC<WorkFormProps> = ({ data, onChange }) => {
  const { handleAnalyze } = useSectionAnalysis<Work>('Work Experience Entry');

  const validate = (entry: Work) => {
    if (!entry.summary && (!entry.highlights || entry.highlights.length === 0)) {
      return 'Please add some content (Summary or Highlights) to analyze.';
    }
    return null;
  };

  return (
    <GenericSectionForm<Work>
      data={data}
      onChange={onChange}
      title="Work Experience"
      addLabel="Add Job"
      emptyMessage='No work experience added yet. Click "Add Job" to start.'
      defaultEntry={defaultEntry}
      getTitle={(entry) => entry.name || '(New Position)'}
      onAnalyze={(idx, entry, setIdx) => handleAnalyze(idx, entry, setIdx, validate)}
      renderFields={(entry, handleChange) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GridField label="Company Name">
              <Input
                value={entry.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </GridField>
            <GridField label="Position / Title">
              <Input
                value={entry.position || ''}
                onChange={(e) => handleChange('position', e.target.value)}
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

          <GridField label="Summary / Description">
            <Textarea
              value={entry.summary || ''}
              onChange={(e) => handleChange('summary', e.target.value)}
              rows={3}
            />
          </GridField>
        </>
      )}
    />
  );
};

export default WorkForm;
