import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Project } from '@/types/resume';
import { Plus, Trash2, Wand2, Loader2 } from 'lucide-react';
import { analyzeResumeSection, getStoredAIConfig } from '@/services/geminiService';

interface ProjectsFormProps {
  data: Project[];
  onChange: (data: Project[]) => void;
}

const ProjectsForm: React.FC<ProjectsFormProps> = ({ data, onChange }) => {
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);

  const handleAdd = () => {
    onChange([{ name: '', description: '' }, ...data]);
  };

  const handleRemove = (index: number) => {
    if (confirm('Remove this project?')) {
      const newData = [...data];
      newData.splice(index, 1);
      onChange(newData);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (index: number, field: keyof Project, value: any) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    onChange(newData);
  };

  const handleAnalyze = async (index: number) => {
    const entry = data[index];
    if (!entry.description) {
      alert('Please add a description to analyze.');
      return;
    }

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      alert('Please set API Key in settings.');
      return;
    }

    setAnalyzingIndex(index);
    try {
      const result = await analyzeResumeSection('Project Entry', entry, config);
      alert(`AI Critique:\n${result.critique}\n\nRewritten Example:\n${result.rewrittenExample}`);
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
        <h2 className="text-xl font-bold text-slate-800">Projects</h2>
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Project
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
              title="AI Roast & Fix"
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
            <CardTitle className="text-base">{entry.name || '(New Project)'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  value={entry.name || ''}
                  onChange={(e) => handleChange(index, 'name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>URL / Link</Label>
                <Input
                  value={entry.url || ''}
                  onChange={(e) => handleChange(index, 'url', e.target.value)}
                  placeholder="https://..."
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

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={entry.description || ''}
                onChange={(e) => handleChange(index, 'description', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {data.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-slate-400">
          No projects added yet.
        </div>
      )}
    </div>
  );
};

export default ProjectsForm;
