import React, { useRef, useState, useEffect } from 'react';
import { useSkillAssessmentStore } from '@/features/skill-assessment/stores/useSkillAssessmentStore';
import { parseResume } from '@/services/resume/resumeParser';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { extractSkills } from '@/features/skill-assessment/services/skillAssessmentAiService';
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

      const fallbackExtractSkillsFromText = (rawText: string): string[] => {
        const rawTokens = rawText
          .split(/[\n,]/) // split on newlines and commas
          .map((token) => token.trim())
          .filter((token) => token.length > 1); // filter out empty / 1-char noise

        const unique: string[] = [];
        const seen = new Set<string>();

        rawTokens.forEach((token) => {
          const normalized = token.toLowerCase();
          if (!seen.has(normalized)) {
            seen.add(normalized);
            unique.push(token);
          }
        });

        return unique;
      };

      const skillExtractionConfig = getStoredAIConfig();

      if (skillExtractionConfig?.apiKey) {
        try {
          skills = await extractSkills(text, skillExtractionConfig);
        } catch (skillExtractionError) {
          console.warn(
            'AI skill extraction failed, falling back to heuristic parsing:',
            skillExtractionError
          );
          skills = fallbackExtractSkillsFromText(text);
        }
      } else {
        skills = fallbackExtractSkillsFromText(text);
      }

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

  const processFile = async (file: File) => {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
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
      <div className="max-w-5xl mx-auto mt-4 md:mt-10">
        <div className="mb-8 text-center sm:text-left px-2">
          <h2 className="text-3xl font-bold tracking-tight">Upload Resume</h2>
          <p className="text-muted-foreground mt-2">
            Upload a new CV or select a previously saved one to extract skills and start the
            assessment.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2">
          {/* Column 1: Upload */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                New Upload
              </CardTitle>
              <CardDescription>Upload a PDF, TXT, or DOCX file (Max 5MB)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className={`border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${isLoading ? 'opacity-50 pointer-events-none' : 'hover:bg-muted/50 hover:border-primary/50'}`}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <UploadCloud className="w-8 h-8 text-primary" />
                </div>
                <p className="text-base font-medium text-foreground mb-1 text-center">
                  Click or drag file to this area
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  We&apos;ll use AI to extract your skills automatically
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

              {isLoading && !selectedResumeId && (
                <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                  <p className="text-sm font-medium">Extracting skills via AI...</p>
                  <p className="text-xs text-muted-foreground">This may take a few seconds</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm text-center">
                  {error}
                </div>
              )}

              {showManual && (
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-sm font-medium">
                    AI extraction failed. Please enter your skills manually (comma separated):
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      value={manualSkills}
                      onChange={(e) => setManualSkills(e.target.value)}
                      placeholder="e.g. React, TypeScript, Node.js"
                      onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                      className="flex-1"
                    />
                    <Button onClick={handleManualSubmit} className="w-full sm:w-auto">
                      Continue
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Column 2: Saved Resumes */}
          <div className="space-y-6">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Saved Resumes
                </CardTitle>
                <CardDescription>Select an existing resume to reuse</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {savedResumes.length > 0 ? (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <ResumeList
                      resumes={savedResumes}
                      selectedResumeId={selectedResumeId}
                      onSelect={(r) =>
                        setSelectedResumeId(r.id === selectedResumeId ? undefined : r.id)
                      }
                      onDelete={handleDeleteResume}
                      onToggleMain={handleToggleMain}
                      onRefresh={loadData}
                    />

                    {selectedResumeId && (
                      <div className="pt-6 mt-auto border-t">
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
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                    <p className="text-sm">No saved resumes found.</p>
                    <p className="text-xs mt-1">Upload a new one on the left to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
