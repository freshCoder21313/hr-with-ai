import React from 'react';
import { Upload, Sparkles, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingButton } from '@/components/ui/loading-button';
import ResumeList from '../../ResumeList';
import { ResumeAnalysisView } from '@/features/resume-analysis';
import { Resume, ResumeAnalysis } from '@/types';

interface ResumeSelectorProps {
  savedResumes: Resume[];
  selectedResumeId?: number;
  resumeText: string;
  jobDescription: string;
  isParsing: boolean;
  isAnalyzing: boolean;
  resumeAnalysis?: ResumeAnalysis | null;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResumeSelect: (resume: Resume) => void;
  onDeleteResume: (id: number) => void;
  onTailorClick: (resume: Resume) => void;
  onToggleMain: (resume: Resume) => void;
  onRefresh: () => void;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onAnalyzeResume: () => void;
  onFindJobClick: () => void;
}

export const ResumeSelector: React.FC<ResumeSelectorProps> = ({
  savedResumes,
  selectedResumeId,
  resumeText,
  jobDescription,
  isParsing,
  isAnalyzing,
  resumeAnalysis,
  onFileUpload,
  onResumeSelect,
  onDeleteResume,
  onTailorClick,
  onToggleMain,
  onRefresh,
  onChange,
  onAnalyzeResume,
  onFindJobClick,
}) => {
  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex justify-between items-center">
        <Label htmlFor="resumeText">Resume / CV Content</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onFindJobClick}
            className="text-yellow-500 border-primary/20 hover:bg-primary/10 hover:border-primary/50 dark:text-primary dark:border-yellow-500/30 dark:hover:bg-primary/10"
          >
            <Briefcase className="mr-2 h-4 w-4" /> Find Job with CV
          </Button>
          <LoadingButton
            variant="outline"
            size="sm"
            isLoading={isParsing}
            loadingText="Reading PDF..."
            disabled={isParsing}
            className="relative"
          >
            <Upload className="mr-2 h-4 w-4" /> Upload PDF/TXT
            <input
              type="file"
              accept=".pdf,.txt"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={onFileUpload}
              disabled={isParsing}
            />
          </LoadingButton>
        </div>
      </div>

      <ResumeList
        resumes={savedResumes}
        selectedResumeId={selectedResumeId}
        onSelect={onResumeSelect}
        onDelete={onDeleteResume}
        onTailor={onTailorClick}
        onToggleMain={onToggleMain}
        onRefresh={onRefresh}
      />

      <Textarea
        id="resumeText"
        name="resumeText"
        value={resumeText}
        onChange={onChange}
        rows={5}
        placeholder="Paste your resume text here..."
        className="font-mono text-sm"
      />

      {resumeText && jobDescription && (
        <div className="pt-2">
          <LoadingButton
            type="button"
            variant="secondary"
            onClick={onAnalyzeResume}
            disabled={isAnalyzing}
            isLoading={isAnalyzing}
            loadingText="Analyzing Fit..."
            className="w-full"
            leftIcon={<Sparkles className="w-4 h-4 text-primary" />}
          >
            Analyze Resume Fit (AI)
          </LoadingButton>
        </div>
      )}

      {resumeAnalysis && <ResumeAnalysisView analysis={resumeAnalysis} />}
    </div>
  );
};
