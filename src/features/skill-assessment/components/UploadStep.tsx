import React, { useRef, useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useSkillAssessmentStore } from '@/features/skill-assessment/stores/useSkillAssessmentStore';
import { parseResume } from '@/services/resume/resumeParser';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { extractSkills } from '@/features/skill-assessment/services/skillAssessmentAiService';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { Resume } from '@/types';
import { notificationService } from '@/services/core/notificationService';
import { ExtractionModeToggle } from './upload-step/ExtractionModeToggle';
import { FileUploadZone } from './upload-step/FileUploadZone';
import { SavedResumeSelector } from './upload-step/SavedResumeSelector';

type ExtractionMode = 'auto' | 'ai' | 'regex';

export const UploadStep: React.FC = () => {
  const { setExtractedSkills, setStep, setIsLoading, setError, isLoading, error } =
    useSkillAssessmentStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualSkills, setManualSkills] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>('auto');

  const [savedResumes, setSavedResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number>();

  const loadData = async () => {
    try {
      const resumes = await db.resumes.toArray();
      setSavedResumes(resumes.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      logger.error('Failed to load resumes:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteResume = async (id: number) => {
    const confirmed = await notificationService.confirm({
      title: 'Delete Resume',
      message: 'Are you sure you want to delete this resume?',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await db.resumes.delete(id);
      setSavedResumes((prev) => prev.filter((r) => r.id !== id));
      if (selectedResumeId === id) {
        setSelectedResumeId(undefined);
      }
      toast.success('Resume deleted successfully');
    } catch (err) {
      logger.error('Failed to delete resume:', err);
      toast.error('Failed to delete resume');
    }
  };

  const processResumeText = async (text: string) => {
    try {
      setIsLoading(true);
      setError(null);

      let skills: string[] = [];

      const fallbackExtractSkillsFromText = (rawText: string): string[] => {
        const skillsSectionMatch = rawText.match(
          /(?:skills|technologies|tools|expertise)(?:[\s\S]*?)(?=\n[A-Z][a-z]+:|\n\n[A-Z]|$)/i
        );

        if (!skillsSectionMatch) return [];

        const rawTokens = skillsSectionMatch[0]
          .split(/[\n,•|;]/)
          .map((token) => token.trim())
          .filter((token) => token.length > 1 && token.length <= 40)
          .filter((token) => /^[a-zA-Z0-9\s.+#-]{2,40}$/.test(token));

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

      if (extractionMode === 'regex') {
        skills = fallbackExtractSkillsFromText(text);
      } else if (extractionMode === 'ai') {
        if (!skillExtractionConfig?.apiKey) {
          throw new Error(
            'AI API Key is missing. Please configure it in settings or use Auto/Regex mode.'
          );
        }
        skills = await extractSkills(text, skillExtractionConfig);
      } else {
        if (skillExtractionConfig?.apiKey) {
          try {
            skills = await extractSkills(text, skillExtractionConfig);
          } catch (skillExtractionError) {
            logger.warn(
              'AI skill extraction failed, falling back to heuristic parsing:',
              skillExtractionError
            );
            skills = fallbackExtractSkillsFromText(text);
          }
        } else {
          skills = fallbackExtractSkillsFromText(text);
        }
      }

      if (skills.length > 0) {
        setExtractedSkills(skills);
        setStep('select_skill');
      } else {
        throw new Error('No skills could be extracted automatically');
      }
    } catch (err) {
      logger.error(err);
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
        logger.error('Failed to save resume to DB', dbErr);
      }

      await processResumeText(text);
    } catch (err) {
      logger.error(err);
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
    if (file) await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
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

    const uniqueSkills = [...new Set(skillsList)];

    if (uniqueSkills.length > 0) {
      setExtractedSkills(uniqueSkills);
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
      logger.error('Failed to set main CV:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-4 md:mt-10">
      <div className="mb-8 text-center sm:text-left px-2">
        <h2 className="text-3xl font-bold tracking-tight">Upload Resume</h2>
        <p className="text-muted-foreground mt-2 mb-4">
          Upload a new CV or select a previously saved one to extract skills and start the
          assessment.
        </p>

        <ExtractionModeToggle
          value={extractionMode}
          onValueChange={setExtractionMode}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2">
        <FileUploadZone
          isLoading={isLoading}
          selectedResumeId={selectedResumeId}
          error={error}
          showManual={showManual}
          manualSkills={manualSkills}
          fileInputRef={fileInputRef}
          onUploadClick={() => !isLoading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onFileUpload={handleFileUpload}
          onManualSkillsChange={setManualSkills}
          onManualSubmit={handleManualSubmit}
        />

        <div className="space-y-6">
          <SavedResumeSelector
            savedResumes={savedResumes}
            selectedResumeId={selectedResumeId}
            isLoading={isLoading}
            onSelect={setSelectedResumeId}
            onDelete={handleDeleteResume}
            onToggleMain={handleToggleMain}
            onRefresh={loadData}
            onAnalyzeSelected={handleAnalyzeSelected}
          />
        </div>
      </div>
    </div>
  );
};
