import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Education } from '@/types/resume';
import { Plus, Trash2, Wand2, Loader2 } from 'lucide-react';
import { analyzeResumeSection, getStoredAIConfig } from '@/services/geminiService';

interface EducationFormProps {
  data: Education[];
  onChange: (data: Education[]) => void;
}

const EducationForm: React.FC<EducationFormProps> = ({ data, onChange }) => {
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);

  const handleAdd = () => {
    onChange([{ institution: '', area: '', studyType: '', startDate: '', endDate: '' }, ...data]);
  };

  const handleRemove = (index: number) => {
    if (confirm('Remove this education entry?')) {
      const newData = [...data];
      newData.splice(index, 1);
      onChange(newData);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (index: number, field: keyof Education, value: any) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    onChange(newData);
  };

  // Although analysis might be less common for education, it can help check for formatting
  const handleAnalyze = async (index: number) => {
    const entry = data[index];
    const config = getStoredAIConfig();
    if (!config.apiKey) {
      alert('Please set API Key in settings.');
      return;
    }

    setAnalyzingIndex(index);
    try {
      const result = await analyzeResumeSection('Education Entry', entry, config);
      alert(`AI Critique:\n${result.critique}\n\nSuggestion:\n${result.suggestions.join('\n- ')}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      alert('Analysis failed: ' + e.message);
    } finally {
      setAnalyzingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Education</h2>
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Education
        </Button>
      </div>

      {data.map((entry, index) => (
        <Card key={index} className="relative group">
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAnalyze(index)}
              disabled={analyzingIndex === index}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
              title="AI Check"
            >
              {analyzingIndex === index ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleRemove(index)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <CardHeader>
            <CardTitle className="text-base">{entry.institution || '(New School)'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Institution / School</Label>
                <Input
                  value={entry.institution || ''}
                  onChange={(e) => handleChange(index, 'institution', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Degree / Study Type</Label>
                <Input
                  value={entry.studyType || ''}
                  onChange={(e) => handleChange(index, 'studyType', e.target.value)}
                  placeholder="e.g. Bachelor of Science"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Area / Major</Label>
                <Input
                  value={entry.area || ''}
                  onChange={(e) => handleChange(index, 'area', e.target.value)}
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div className="space-y-2">
                <Label>GPA / Score (Optional)</Label>
                <Input
                  value={entry.score || ''}
                  onChange={(e) => handleChange(index, 'score', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  value={entry.startDate || ''}
                  onChange={(e) => handleChange(index, 'startDate', e.target.value)}
                  placeholder="YYYY-MM"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  value={entry.endDate || ''}
                  onChange={(e) => handleChange(index, 'endDate', e.target.value)}
                  placeholder="YYYY-MM or Present"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {data.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-slate-400">
          No education history added yet.
        </div>
      )}
    </div>
  );
};

export default EducationForm;
