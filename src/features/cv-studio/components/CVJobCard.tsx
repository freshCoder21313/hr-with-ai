import { useId, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Job } from '../stores/useJobStore';
import { JobWithStatus } from '../hooks/useCVTailoring';

interface CVJobCardProps {
  job: Job;
  isSelected: boolean;
  status: Partial<JobWithStatus>;
  isProcessing: boolean;
  onSelect: (checked: boolean) => void;
  onRemove: () => void;
  onChange: (field: keyof Job, value: string) => void;
  onViewResult: (id: number) => void;
  onReTailor: () => void;
}

export const CVJobCard: React.FC<CVJobCardProps> = ({
  job,
  isSelected,
  status,
  isProcessing,
  onSelect,
  onRemove,
  onChange,
  onReTailor,
  onViewResult,
}) => {
  const [expanded, setExpanded] = useState(false);
  const companyId = useId();
  const titleId = useId();
  const urlId = useId();
  const descriptionId = useId();
  const customPromptId = useId();
  const jobLabel = `${job.title || 'Untitled'}${job.company ? ` @ ${job.company}` : ''}`;
  const isDone = status.status === 'completed';
  const isRunning = status.status === 'processing';
  const hasError = status.status === 'error';

  return (
    <div
      className={`rounded-lg border bg-card transition-all ${
        isRunning ? 'border-primary ring-1 ring-primary/20' : 'border-border'
      } ${isDone && !expanded ? 'opacity-80' : ''}`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(c) => onSelect(!!c)}
          disabled={isProcessing}
          className="shrink-0"
          aria-label={`Select ${jobLabel} for tailoring`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate text-foreground">
            {job.title || 'Untitled'}
            {job.company ? ` @ ${job.company}` : ''}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {job.description ? job.description.slice(0, 50) + '\u2026' : 'No JD yet'}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {job.url && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                window.open(job.url, '_blank', 'noopener,noreferrer');
              }}
              title="Open original job posting"
              aria-label="Open original job posting"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          )}
          {isDone && (
            <Badge className="bg-emerald-700 text-white hover:bg-emerald-700/90 dark:bg-emerald-500 dark:text-emerald-950 text-[10px] h-5 px-1.5">
              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" /> Done
            </Badge>
          )}
          {hasError && (
            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
              <AlertCircle className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" /> Err
            </Badge>
          )}
          {isRunning && (
            <Loader2 className="w-3 h-3 animate-spin text-primary" aria-hidden="true" />
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={isProcessing}
            aria-label="Delete job"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse job details' : 'Expand job details'}
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={companyId} className="text-[10px]">
                Company
              </Label>
              <Input
                id={companyId}
                className="h-10 md:h-7 text-base md:text-xs"
                placeholder="Google"
                value={job.company}
                onChange={(e) => onChange('company', e.target.value)}
                disabled={isProcessing}
              />
            </div>
            <div>
              <Label htmlFor={titleId} className="text-[10px]">
                Title
              </Label>
              <Input
                id={titleId}
                className="h-10 md:h-7 text-base md:text-xs"
                placeholder="SWE"
                value={job.title}
                onChange={(e) => onChange('title', e.target.value)}
                disabled={isProcessing}
              />
            </div>
          </div>
          <div>
            <Label htmlFor={urlId} className="text-[10px]">
              Job URL (optional)
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id={urlId}
                className="h-10 md:h-7 text-base md:text-xs"
                placeholder="https://..."
                value={job.url || ''}
                onChange={(e) => onChange('url', e.target.value)}
                disabled={isProcessing}
              />
              {job.url && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="h-10 md:h-7 w-10 md:w-7 shrink-0 text-muted-foreground hover:text-primary"
                  onClick={() => window.open(job.url, '_blank', 'noopener,noreferrer')}
                  title="Open original job posting"
                  aria-label="Open link in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor={descriptionId} className="text-[10px]">
              Job Description
            </Label>
            <Textarea
              id={descriptionId}
              className="min-h-[80px] text-xs font-mono"
              placeholder="Paste JD here..."
              value={job.description}
              onChange={(e) => onChange('description', e.target.value)}
              disabled={isProcessing}
            />
          </div>
          <div>
            <Label htmlFor={customPromptId} className="text-[10px]">
              Custom Prompt (optional)
            </Label>
            <Textarea
              id={customPromptId}
              className="min-h-[48px] text-xs"
              placeholder="Emphasize React experience..."
              value={job.customPrompt}
              onChange={(e) => onChange('customPrompt', e.target.value)}
              disabled={isProcessing}
            />
          </div>
          {isDone && (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={onReTailor}
              disabled={isProcessing}
            >
              <RefreshCw className="w-3 h-3 mr-1" aria-hidden="true" /> Re-tailor with corrected JD
            </Button>
          )}
          {isDone && status.resultId && (
            <Button
              size="sm"
              variant="secondary"
              className="w-full text-xs"
              onClick={() => onViewResult(status.resultId!)}
            >
              View Tailored CV →
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
