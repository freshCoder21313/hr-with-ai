import React, { useRef, useState } from 'react';
import { useSkillAssessmentStore } from '../stores/useSkillAssessmentStore';
import { parseResume } from '@/services/resumeParser';
import { extractSkills } from '../services/skillAssessmentAiService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

export const UploadStep: React.FC = () => {
  const { setExtractedSkills, setStep, setIsLoading, setError, isLoading, error } =
    useSkillAssessmentStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualSkills, setManualSkills] = useState('');
  const [showManual, setShowManual] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    const validTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a PDF, TXT, or DOCX file.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const text = await parseResume(file);
      const config = getStoredAIConfig();
      if (!config.apiKey) {
        toast.error('Please configure your AI Provider API key in Settings first.');
        setIsLoading(false);
        return;
      }

      const skills = await extractSkills(text, config);
      if (skills && skills.length > 0) {
        setExtractedSkills(skills);
        setStep('select_skill');
      } else {
        throw new Error('No skills could be extracted');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to extract skills');
      setShowManual(true);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = () => {
    const skillsList = manualSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillsList.length > 0) {
      setExtractedSkills(skillsList);
      setStep('select_skill');
    } else {
      toast.error('Please enter at least one skill');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>Skill Assessment</CardTitle>
        <CardDescription>
          Upload your CV or resume to extract skills and start the assessment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            Click or drag file to this area to upload
          </p>
          <p className="text-xs text-muted-foreground">
            Supported formats: PDF, TXT, DOCX (Max 5MB)
          </p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.txt,.docx"
            onChange={handleFileUpload}
            disabled={isLoading}
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Extracting skills...
          </div>
        )}

        {error && <div className="text-sm text-destructive text-center">{error}</div>}

        {showManual && (
          <div className="space-y-4 pt-4 border-t">
            <Label>
              AI extraction failed. Please enter your skills manually (comma separated):
            </Label>
            <div className="flex gap-2">
              <Input
                value={manualSkills}
                onChange={(e) => setManualSkills(e.target.value)}
                placeholder="e.g. React, TypeScript, Node.js"
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit}>Continue</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
