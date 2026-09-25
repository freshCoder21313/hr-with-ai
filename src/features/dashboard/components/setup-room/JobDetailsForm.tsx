import React from 'react';
import { Search, Users, ChevronDown, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { isNonEmptyString } from '@/lib/validation';
import { SavedJob } from '@/types/jobs';
import { SetupFormData } from '@/types';

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
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
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
}) => {
  return (
    <div className="space-y-4 md:space-y-8">
      {/* Saved Jobs Selector */}
      <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border">
        <div className="flex-1">
          <Label className="mb-2 block">Load Saved Job</Label>
          <div className="relative">
            <select
              value={selectedJobId}
              onChange={onSelectSavedJob}
              className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
            >
              <option value="new">+ New / Custom Job</option>
              {savedJobs.map((job) => (
                <option key={job.id} value={job.id?.toString()}>
                  {job.jobTitle} @ {job.company}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
          </div>
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
              onClick={(e) => onDeleteJob(e, parseInt(selectedJobId))}
              title="Delete this saved job"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
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
            value={formData.company}
            onChange={onChange}
            placeholder="e.g. Google, Shopee, Startup..."
            className="h-11"
          />
          <div className="mt-2">
            <LoadingButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResearchCompany}
              disabled={isResearching || !isNonEmptyString(formData.company)}
              isLoading={isResearching}
              loadingText="Researching..."
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-0 h-auto"
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
          <select
            id="language"
            name="language"
            value={formData.language}
            onChange={onChange}
            className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="en-US">English (US)</option>
            <option value="vi-VN">Tiếng Việt</option>
          </select>
        </div>
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="type">Interview Type</Label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={onChange}
            className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="standard">Standard</option>
            <option value="coding">Coding (Technical)</option>
            <option value="system_design">System Design</option>
            <option value="behavioral">Behavioral (STAR)</option>
          </select>
        </div>
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="mode">Interaction Mode</Label>
          <select
            id="mode"
            name="mode"
            value={formData.mode}
            onChange={onChange}
            className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="text">Text Chat</option>
            <option value="voice">Voice Interview</option>
            <option value="hybrid">Hybrid (Text + Voice)</option>
          </select>
        </div>
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="isPanel" className="flex items-center gap-2 cursor-pointer">
            <Users className="w-4 h-4 text-primary" /> Panel Interview
          </Label>
          <button
            type="button"
            role="switch"
            aria-checked={formData.isPanel}
            className={`flex w-full text-left items-center gap-3 p-3 rounded-md border transition-all cursor-pointer ${
              formData.isPanel
                ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                : 'bg-background border-input hover:bg-accent/50'
            }`}
            onClick={onTogglePanel}
          >
            <div
              className={`w-10 h-5 rounded-full relative transition-colors ${formData.isPanel ? 'bg-primary' : 'bg-muted'}`}
            >
              <div
                className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${formData.isPanel ? 'translate-x-5' : ''}`}
              />
            </div>
            <span className="text-sm font-medium">
              {formData.isPanel ? 'Enabled' : 'Disabled'}
            </span>
          </button>
          <p className="text-[10px] text-muted-foreground italic">
            AI will simulate multiple interviewers.
          </p>
        </div>
      </div>

      {/* Difficulty, Status, Context */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="difficulty">Difficulty Level</Label>
          <select
            id="difficulty"
            name="difficulty"
            value={formData.difficulty}
            onChange={onChange}
            className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="easy">Easy (Friendly)</option>
            <option value="medium">Medium (Standard)</option>
            <option value="hard">Hard (Strict)</option>
            <option value="hardcore">Hardcore (Pressure)</option>
          </select>
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
