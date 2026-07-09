import React from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Work } from '@/types/resume';
import { analyzeResumeSection } from '@/services/resume/resumeAIService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { GridField } from './entry-list.shared';
import { GenericSectionForm } from './GenericSectionForm';

interface WorkFormProps {
  data: Work[];
  onChange: (data: Work[]) => void;
}

const defaultEntry: Work = { name: '', position: '', summary: '' };

const WorkForm: React.FC<WorkFormProps> = ({ data, onChange }) => {
  const handleAnalyze = async (
    index: number,
    entry: Work,
    setAnalyzingIndex: (i: number | null) => void
  ) => {
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
      toast.info(
        `AI Critique:\n${result.critique}\n\nRewritten Example:\n${result.rewrittenExample}`,
        { duration: 8000 }
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Analysis failed';
      toast.error('Analysis failed: ' + msg);
    } finally {
      setAnalyzingIndex(null);
    }
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
      onAnalyze={handleAnalyze}
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
