import React, { useRef, useState, useEffect } from 'react';
import { useSkillAssessmentStore } from '../stores/useSkillAssessmentStore';
import { parseResume } from '@/services/resumeParser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, UploadCloud, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { Resume } from '@/types';
import ResumeList from '@/features/dashboard/ResumeList';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { LoadingButton } from '@/components/ui/loading-button';

export const UploadStep: React.FC = () => {
  const { setExtractedSkills, setStep, setIsLoading, setError, isLoading, error } =
    useSkillAssessmentStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualSkills, setManualSkills] = useState('');
  const [showManual, setShowManual] = useState(false);

  const [savedResumes, setSavedResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number>();
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const loadData = async () => {
    try {
      const resumes = await db.resumes.toArray();
      setSavedResumes(resumes.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error('Failed to load resumes:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteResume = async (id: number) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Resume',
      description: 'Are you sure you want to delete this resume?',
      onConfirm: async () => {
        try {
          await db.resumes.delete(id);
          setSavedResumes((prev) => prev.filter((r) => r.id !== id));
          if (selectedResumeId === id) {
            setSelectedResumeId(undefined);
          }
          toast.success('Resume deleted successfully');
        } catch (err) {
          console.error('Failed to delete resume:', err);
          toast.error('Failed to delete resume');
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const processResumeText = async (text: string) => {
    try {
      setIsLoading(true);
      setError(null);

      let skills: string[] = [];
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data.skills)) {
          data.skills.forEach((section: any) => {
            if (Array.isArray(section.keywords)) {
              skills.push(...section.keywords);
            }
          });
        }
      } catch (e) {
        // Fallback to simple comma‑separated parsing
        skills = text.split(',').map(s => s.trim()).filter(Boolean);
      }
      // Remove duplicates and empty strings
      skills = Array.from(new Set(skills.map(s => s.trim()))).filter(Boolean);
      if (skills.length > 0) {
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
    }
  };

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
      const text = await parseResume(file);

      // Save to DB
      const newResume: Resume = {
        createdAt: Date.now(),
        fileName: file.name,
        rawText: text,
      };

      try {
        const id = await db.resumes.add(newResume);
        const savedResume = { ...newResume, id };
        setSavedResumes((prev) => [savedResume, ...prev]);
        setSelectedResumeId(id);
      } catch (dbErr) {
        console.error('Failed to save resume to DB', dbErr);
      }

      await processResumeText(text);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setShowManual(true);
      setIsLoading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAnalyzeSelected = () => {
    const resume = savedResumes.find((r) => r.id === selectedResumeId);
    if (resume) {
      processResumeText(resume.rawText);
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

  const handleToggleMain = async (resume: Resume) => {
    if (!resume.id) return;
    try {
      await db.setMainCV(resume.id);
      const updated = await db.resumes.toArray();
      setSavedResumes(updated.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error('Failed to set main CV:', err);
    }
  };

  return (
    <>
      <Card className="max-w-2xl mx-auto mt-10">
        <CardHeader>
          <CardTitle>Skill Assessment</CardTitle>
          <CardDescription>
            Select a saved CV or upload a new one to extract skills and start the assessment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={`border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${isLoading ? 'opacity-50 pointer-events-none' : 'hover:bg-muted/50'}`}
            onClick={() => !isLoading && fileInputRef.current?.click()}
          >
            <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Click or drag file to this area to upload new CV
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

          {savedResumes.length > 0 && (
            <div className="space-y-2 pt-2">
              <Label>Or select a previously saved CV:</Label>
              <ResumeList
                resumes={savedResumes}
                selectedResumeId={selectedResumeId}
                onSelect={(r) => setSelectedResumeId(r.id === selectedResumeId ? undefined : r.id)}
                onDelete={handleDeleteResume}
                onToggleMain={handleToggleMain}
                onRefresh={loadData}
              />
            </div>
          )}

          {selectedResumeId && (
            <div className="pt-2">
              <LoadingButton
                type="button"
                onClick={handleAnalyzeSelected}
                disabled={isLoading}
                isLoading={isLoading}
                loadingText="Extracting Skills..."
                className="w-full"
                leftIcon={<Sparkles className="w-4 h-4 text-primary-foreground" />}
              >
                Extract Skills from Selected CV
              </LoadingButton>
            </div>
          )}

          {isLoading && !selectedResumeId && (
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

      <ConfirmationDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={true}
      />
    </>
  );
};
