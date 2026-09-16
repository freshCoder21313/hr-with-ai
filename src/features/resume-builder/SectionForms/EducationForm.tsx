import React from 'react';
import { Input } from '@/components/ui/input';
import { Education } from '@/types/resume';
import { GridField, useSectionAnalysis } from './entry-list.shared';
import { GenericSectionForm } from './GenericSectionForm';

interface EducationFormProps {
  data: Education[];
  onChange: (data: Education[]) => void;
}

const defaultEntry: Education = {
  institution: '',
  area: '',
  studyType: '',
  startDate: '',
  endDate: '',
};

const EducationForm: React.FC<EducationFormProps> = ({ data, onChange }) => {
  const { handleAnalyze } = useSectionAnalysis<Education>('Education Entry');

  return (
    <GenericSectionForm<Education>
      data={data}
      onChange={onChange}
      title="Education"
      addLabel="Add Education"
      emptyMessage="No education history added yet."
      defaultEntry={defaultEntry}
      getTitle={(entry) => entry.institution || '(New School)'}
      onAnalyze={handleAnalyze}
      analyzeTooltip="AI Check"
      renderFields={(entry, handleChange) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GridField label="Institution / School">
              <Input
                value={entry.institution || ''}
                onChange={(e) => handleChange('institution', e.target.value)}
              />
            </GridField>
            <GridField label="Degree / Study Type">
              <Input
                value={entry.studyType || ''}
                onChange={(e) => handleChange('studyType', e.target.value)}
                placeholder="e.g. Bachelor of Science"
              />
            </GridField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GridField label="Area / Major">
              <Input
                value={entry.area || ''}
                onChange={(e) => handleChange('area', e.target.value)}
                placeholder="e.g. Computer Science"
              />
            </GridField>
            <GridField label="GPA / Score (Optional)">
              <Input
                value={entry.score || ''}
                onChange={(e) => handleChange('score', e.target.value)}
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
        </>
      )}
    />
  );
};

export default EducationForm;
