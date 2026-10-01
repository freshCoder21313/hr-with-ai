import React, { useState } from 'react';
import { Search, Users, ChevronDown, Trash2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Switch } from '@/components/ui/switch';
import { isNonEmptyString } from '@/lib/validation';
import { SavedJob } from '@/types/jobs';
import { SetupFormData } from '@/types';
import {
  parseRawJobDescription,
  mapExperienceLevelToDifficulty,
  ParsedJobData,
} from '@/services/jobs/jdParser';
import { toast } from 'sonner';

const NATIVE_SELECT_CLASS =
  'flex h-11 w-full items-center rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground ring-offset-background transition-colors appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

/** A native `<select>` with a chevron overlay that never eats clicks. */
const NativeSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className="relative">
    <select {...props} className={`${NATIVE_SELECT_CLASS}${className ? ` ${className}` : ''}`}>
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
  </div>
);

interface JobDetailsFormProps {
  formData: SetupFormData;
  selectedJobId: string;
  savedJobs: SavedJob[];
  isResearching: boolean;
  onSelectSavedJob: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSaveJob: () => void;
  onDeleteJob: (e: React.MouseEvent, id: number) => void;
  onResearchCompany: () => void;
  onTogglePanel: () => void;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  onAutoFillFromRawJD?: (parsed: ParsedJobData) => void;
}

export const JobDetailsForm: React.FC<JobDetailsFormProps> = ({
  formData,
  selectedJobId,
  savedJobs,
  isResearching,
  onSelectSavedJob,
  onSaveJob,
  onDeleteJob,
  onResearchCompany,
  onTogglePanel,
  onChange,
  onAutoFillFromRawJD,
}) => {
  const [isAutoFillOpen, setIsAutoFillOpen] = useState(false);
  const [rawJdText, setRawJdText] = useState('');
  const [lastParsed, setLastParsed] = useState<ParsedJobData | null>(null);

  const handleQuickAutoFill = () => {
    if (!rawJdText.trim()) {
      toast.error('Please paste raw Job Description text first.');
      return;
    }

    const result = parseRawJobDescription(rawJdText);
    setLastParsed(result);

    const mappedDifficulty = mapExperienceLevelToDifficulty(result.experienceLevel);

    if (onAutoFillFromRawJD) {
      onAutoFillFromRawJD(result);
    }

    // Trigger synthetic onChange events for the required target fields
    if (result.company && result.company !== 'Target Company') {
      onChange({
        target: { name: 'company', value: result.company },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
      onChange({
        target: { name: 'companyName', value: result.company },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }

    if (result.title) {
      onChange({
        target: { name: 'jobTitle', value: result.title },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }

    if (result.description) {
      onChange({
        target: { name: 'jobDescription', value: result.description },
      } as unknown as React.ChangeEvent<HTMLTextAreaElement>);
    }

    if (result.requirements) {
      onChange({
        target: { name: 'requirements', value: result.requirements.join(', ') },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }

    if (result.experienceLevel) {
      onChange({
        target: { name: 'experienceLevel', value: result.experienceLevel },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }

    onChange({
      target: { name: 'difficulty', value: mappedDifficulty },
    } as unknown as React.ChangeEvent<HTMLSelectElement>);

    toast.success('Job details auto-filled from raw JD!');
  };
  return (
    <div className="space-y-4 md:space-y-8">
      {/* Saved Jobs Selector */}
      <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border">
        <div className="flex-1">
          <Label htmlFor="savedJob" className="mb-2 block">
            Load Saved Job
          </Label>
          <NativeSelect
            id="savedJob"
            name="savedJob"
            value={selectedJobId}
            onChange={onSelectSavedJob}
          >
            <option value="new">+ New / Custom Job</option>
            {savedJobs.map((job) => (
              <option key={job.id} value={job.id?.toString()}>
                {job.jobTitle} @ {job.company}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex items-end h-[62px] pb-[2px]">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveJob}
            disabled={!isNonEmptyString(formData.company) || !isNonEmptyString(formData.jobTitle)}
            title="Save current details as a reusable job template"
          >
            Save Job
          </Button>
        </div>
        {selectedJobId !== 'new' && (
          <div className="flex items-end h-[62px] pb-[2px]">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              aria-label="Delete this saved job"
              onClick={(e) => onDeleteJob(e, parseInt(selectedJobId, 10))}
              title="Delete this saved job"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Quick Auto-fill from Raw JD */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 md:p-4 transition-all">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsAutoFillOpen((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors focus:outline-none"
            aria-expanded={isAutoFillOpen}
            aria-controls="raw-jd-autofill-section"
          >
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>✨ Quick Auto-fill from Raw JD</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isAutoFillOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {!isAutoFillOpen && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setIsAutoFillOpen(true)}
              className="text-xs text-primary hover:bg-primary/10"
            >
              Paste JD
            </Button>
          )}
        </div>

        {isAutoFillOpen && (
          <div id="raw-jd-autofill-section" className="mt-3 space-y-3 pt-2 border-t border-primary/10">
            <Label htmlFor="rawJobDescriptionInput" className="text-xs text-muted-foreground">
              Paste raw JD text to automatically fill Company, Title, Description, Requirements &amp; Level:
            </Label>
            <Textarea
              id="rawJobDescriptionInput"
              name="rawJobDescriptionInput"
              value={rawJdText}
              onChange={(e) => setRawJdText(e.target.value)}
              placeholder="Paste raw JD text here (e.g. from LinkedIn, TopCV, Indeed)..."
              rows={4}
              className="font-mono text-xs bg-background"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleQuickAutoFill}
                  disabled={!rawJdText.trim()}
                  className="gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-fill
                </Button>
                {rawJdText && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRawJdText('');
                      setLastParsed(null);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              {lastParsed && (
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  {lastParsed.experienceLevel && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                      Level: {lastParsed.experienceLevel}
                    </span>
                  )}
                  {lastParsed.requirements.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {lastParsed.requirements.length} requirements
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Target Company & Job Title */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="company">Target Company</Label>
          <Input
            id="company"
            required
            name="company"
            value={formData.company || formData.companyName || ''}
            onChange={onChange}
            placeholder="e.g. Google, Shopee, Startup..."
            className="h-11"
          />
          <div className="mt-2">
            <LoadingButton
              type="button"
              variant="ghost"
              size="xs"
              onClick={onResearchCompany}
              disabled={isResearching || !isNonEmptyString(formData.company)}
              isLoading={isResearching}
              loadingText="Researching..."
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-0"
              leftIcon={<Search className="w-3 h-3" />}
            >
              Auto-Research Company
            </LoadingButton>
          </div>
        </div>
        <div className="space-y-3">
          <Label htmlFor="jobTitle">Job Title</Label>
          <Input
            id="jobTitle"
            required
            name="jobTitle"
            value={formData.jobTitle}
            onChange={onChange}
            placeholder="e.g. Product Manager"
            className="h-11"
          />
        </div>
      </div>

      {/* Persona, Language, Type, Mode, Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="interviewerPersona">Interviewer Persona</Label>
          <Textarea
            id="interviewerPersona"
            required
            name="interviewerPersona"
            value={formData.interviewerPersona}
            onChange={onChange}
            rows={3}
            placeholder="Describe the interviewer's style..."
            className="resize-none"
          />
        </div>
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="language">Language</Label>
          <NativeSelect id="language" name="language" value={formData.language} onChange={onChange}>
            <option value="en-US">English (US)</option>
            <option value="vi-VN">Tiếng Việt</option>
          </NativeSelect>
        </div>
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="type">Interview Type</Label>
          <NativeSelect id="type" name="type" value={formData.type} onChange={onChange}>
            <option value="standard">Standard</option>
            <option value="coding">Coding (Technical)</option>
            <option value="system_design">System Design</option>
            <option value="behavioral">Behavioral (STAR)</option>
          </NativeSelect>
        </div>
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="mode">Interaction Mode</Label>
          <NativeSelect id="mode" name="mode" value={formData.mode} onChange={onChange}>
            <option value="text">Text Chat</option>
            <option value="voice">Voice Interview</option>
            <option value="hybrid">Hybrid (Text + Voice)</option>
          </NativeSelect>
        </div>
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="isPanel" className="flex items-center gap-2 cursor-pointer">
            <Users className="w-4 h-4 text-primary" /> Panel Interview
          </Label>
          <div className="flex items-center gap-3 p-3 rounded-md border border-input">
            <Switch
              id="isPanel"
              checked={formData.isPanel}
              onCheckedChange={onTogglePanel}
              aria-describedby="isPanel-description"
            />
            <span className="text-sm font-medium" id="isPanel-status">
              {formData.isPanel ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p id="isPanel-description" className="text-[10px] text-muted-foreground italic">
            AI will simulate multiple interviewers.
          </p>
        </div>
      </div>

      {/* Difficulty, Status, Context */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="difficulty">Difficulty Level</Label>
          <NativeSelect
            id="difficulty"
            name="difficulty"
            value={formData.difficulty}
            onChange={onChange}
          >
            <option value="easy">Easy (Friendly)</option>
            <option value="medium">Medium (Standard)</option>
            <option value="hard">Hard (Strict)</option>
            <option value="hardcore">Hardcore (Pressure)</option>
          </NativeSelect>
        </div>
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="companyStatus">Company Status</Label>
          <Input
            id="companyStatus"
            name="companyStatus"
            value={formData.companyStatus}
            onChange={onChange}
            placeholder="e.g. Hiring urgently"
            className="h-11"
          />
        </div>
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="interviewContext">Interview Context</Label>
          <Input
            id="interviewContext"
            name="interviewContext"
            value={formData.interviewContext}
            onChange={onChange}
            placeholder="e.g. Modern Video Call"
            className="h-11"
          />
        </div>
      </div>
    </div>
  );
};
