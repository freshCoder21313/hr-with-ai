import { Resume } from '@/types';
import { Job } from '../stores/useJobStore';
import { JobWithStatus } from '../hooks/useCVTailoring';
import { CVJobCard } from './CVJobCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Briefcase,
  Plus,
  Settings,
  Upload,
  Download,
  Play,
  Wand2,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
} from 'lucide-react';

interface CVJobPanelProps {
  jobs: Job[];
  selectedResumeId: number | undefined;
  selectedJobs: Set<string>;
  isJobPanelOpen: boolean;
  isProcessing: boolean;
  progress: number;
  resumes: Resume[];
  processingStatus: Record<string, Partial<JobWithStatus>>;
  onAddJob: () => void;
  onRemoveJob: (id: string) => void;
  onUpdateJob: (id: string, field: keyof Job, value: string) => void;
  onExportJobs: () => void;
  onImportJobs: () => void;
  onStartTailoring: () => void;
  onSelectResume: (id: number) => void;
  onRenameResume: (id: number, newName: string) => void;
  onToggleJobSelection: (id: string) => void;
  onTogglePanel: () => void;
  onOpenPromptModal: () => void;
  onViewResult: (id: number) => void;
}

export const CVJobPanel: React.FC<CVJobPanelProps> = ({
  jobs,
  selectedResumeId,
  selectedJobs,
  isJobPanelOpen,
  isProcessing,
  progress,
  resumes,
  processingStatus,
  onAddJob,
  onRemoveJob,
  onUpdateJob,
  onExportJobs,
  onImportJobs,
  onStartTailoring,
  onSelectResume,
  onRenameResume,
  onToggleJobSelection,
  onTogglePanel,
  onOpenPromptModal,
  onViewResult,
}) => {
  const selectedResumeName = resumes.find((r) => r.id === selectedResumeId)?.fileName;

  return (
    <div
      className={`flex flex-col border-r border-border bg-card shrink-0 transition-all duration-300 ease-in-out ${
        isJobPanelOpen ? 'w-72' : 'w-12'
      }`}
    >
      <div className="h-12 flex items-center justify-between px-2 border-b border-border shrink-0 gap-1">
        {isJobPanelOpen && (
          <div className="flex items-center gap-1.5 min-w-0">
            <Briefcase className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold text-sm truncate">Job Targets</span>
            {jobs.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                {jobs.length}
              </Badge>
            )}
          </div>
        )}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onTogglePanel}
            >
              {isJobPanelOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isJobPanelOpen ? 'Collapse Job Panel' : 'Expand Job Panel'}
          </TooltipContent>
        </Tooltip>
      </div>

      {isJobPanelOpen && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-border space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Source CV
            </Label>
            <div className="flex gap-1.5 items-center">
              <select
                className="flex-1 p-1.5 text-xs border rounded-md bg-background min-w-0"
                value={selectedResumeId ?? ''}
                onChange={(e) => onSelectResume(Number(e.target.value))}
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.isMain ? '\u2605 ' : ''}
                    {r.fileName}
                  </option>
                ))}
              </select>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                    onClick={() => {
                      if (!selectedResumeId) return;
                      const currentName =
                        resumes.find((r) => r.id === selectedResumeId)?.fileName || '';
                      const newName = window.prompt('Enter new CV name:', currentName);
                      if (newName && newName !== currentName && newName.trim()) {
                        onRenameResume(selectedResumeId, newName.trim());
                      }
                    }}
                    disabled={!selectedResumeId}
                  >
                    <Pencil className="w-3 h-3 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rename CV</TooltipContent>
              </Tooltip>
            </div>
            {selectedResumeName && (
              <p className="text-[10px] text-muted-foreground truncate">
                {resumes.find((r) => r.id === selectedResumeId)?.parsedData
                  ? '\u2705 Parsed'
                  : '\u26A0 Not parsed yet'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border flex-wrap">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={onAddJob}>
                  <Plus className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Job</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onOpenPromptModal}>
                  <Settings className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit Global Prompt</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onImportJobs}>
                  <Upload className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Import Jobs</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onExportJobs}
                  disabled={jobs.length === 0}
                >
                  <Download className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export Jobs</TooltipContent>
            </Tooltip>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed px-3 py-1.5 border-b border-border">
            <span className="font-semibold">Note:</span> Your Jobs list and Prompts are saved locally in
            this browser and are not synced to the cloud. Use Export to create backups.
          </p>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {jobs.length === 0 ? (
              <EmptyState
                message="No jobs yet. Click + to add one."
                icon={<Briefcase className="w-8 h-8 opacity-30" />}
              />
            ) : (
              jobs.map((job) => (
                <CVJobCard
                  key={job.id}
                  job={job}
                  isSelected={selectedJobs.has(job.id)}
                  status={processingStatus[job.id] || { status: 'idle' }}
                  isProcessing={isProcessing}
                  onSelect={() => onToggleJobSelection(job.id)}
                  onRemove={() => onRemoveJob(job.id)}
                  onChange={(field, value) => onUpdateJob(job.id, field, value)}
                  onViewResult={onViewResult}
                />
              ))
            )}
          </div>

          <div className="p-3 border-t border-border space-y-2">
            {isProcessing && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tailoring...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
            <Button
              className="w-full h-9 text-sm"
              onClick={onStartTailoring}
              disabled={isProcessing || !selectedResumeId || selectedJobs.size === 0}
            >
              {isProcessing ? (
                <>
                  <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                  Tailoring...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4 fill-current" /> Start Tailoring ({selectedJobs.size})
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {!isJobPanelOpen && (
        <div className="flex flex-col items-center pt-3 gap-2 px-1">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddJob}>
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Add Job</TooltipContent>
          </Tooltip>

          <div className="flex flex-col gap-1.5 items-center mt-1">
            {jobs.map((job) => {
              const s = processingStatus[job.id]?.status || 'idle';
              return (
                <Tooltip key={job.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-2.5 h-2.5 rounded-full border ${
                        s === 'completed'
                          ? 'bg-green-500 border-green-500'
                          : s === 'processing'
                            ? 'bg-primary border-primary animate-pulse'
                            : s === 'error'
                              ? 'bg-destructive border-destructive'
                              : 'bg-transparent border-muted-foreground'
                      } ${selectedJobs.has(job.id) ? 'ring-1 ring-offset-1 ring-primary' : ''}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {job.title || 'Untitled'}
                    {job.company ? ` @ ${job.company}` : ''} \u2014 {s}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {selectedJobs.size > 0 && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-8 w-8 mt-2"
                  onClick={onStartTailoring}
                  disabled={isProcessing || !selectedResumeId}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Start Tailoring Selected Jobs</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
};
