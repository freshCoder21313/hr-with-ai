import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Building2,
  Briefcase,
  FileText,
  MessageSquareText,
  CheckCircle2,
  RotateCcw,
  Link2,
} from 'lucide-react';
import { parseRawJobDescription, ParsedJobData } from '@/services/jobs/jdParser';
import { useJobStore, Job } from '../stores/useJobStore';
import { toast } from 'sonner';

export interface SmartJDImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobAdded?: (job: Omit<Job, 'id'>) => void;
}

export const SmartJDImportModal: React.FC<SmartJDImportModalProps> = ({
  isOpen,
  onClose,
  onJobAdded,
}) => {
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedJobData | null>(null);
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isParsed, setIsParsed] = useState(false);

  const handleParse = () => {
    if (!rawText.trim()) {
      toast.error('Please paste a job description first.');
      return;
    }

    const result = parseRawJobDescription(rawText);
    setParsedData(result);
    setCompany(result.company !== 'Target Company' ? result.company : '');
    setTitle(result.title !== 'Target Role' ? result.title : '');
    setUrl(result.url || '');
    setDescription(result.description);
    setCustomPrompt(result.suggestedCustomPrompt);
    setIsParsed(true);
    toast.success('JD parsed successfully! Review and edit the fields below.');
  };

  const handleReset = () => {
    setRawText('');
    setParsedData(null);
    setCompany('');
    setTitle('');
    setUrl('');
    setDescription('');
    setCustomPrompt('');
    setIsParsed(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleAddJob = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Please provide a Job Title.');
      return;
    }

    const jobData: Omit<Job, 'id'> = {
      company: company.trim() || 'Target Company',
      title: trimmedTitle,
      description: description.trim(),
      customPrompt: customPrompt.trim(),
      ...(url.trim() ? { url: url.trim() } : {}),
    };

    useJobStore.getState().actions.addJob(jobData);
    onJobAdded?.(jobData);

    toast.success(`Job "${jobData.title}" added to Target Jobs!`);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : null)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Auto-fill from Raw JD</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Paste raw Job Description text to automatically extract company, title,
                requirements, and custom tailoring prompt.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Raw Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="raw-jd-textarea"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Raw Job Description Text
              </Label>
              {rawText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleReset}
                  className="h-6 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Button>
              )}
            </div>
            <Textarea
              id="raw-jd-textarea"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw JD here (e.g. from LinkedIn, TopCV, Indeed, email, or PDF)..."
              rows={7}
              className="font-mono text-xs resize-y"
            />
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                onClick={handleParse}
                disabled={!rawText.trim()}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Parse &amp; Extract
              </Button>
            </div>
          </div>

          {/* Step 2: Extracted Preview Section */}
          {isParsed && (
            <div className="space-y-4 pt-4 border-t border-border animate-in fade-in duration-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>Extracted Job Information</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {parsedData?.experienceLevel && (
                    <Badge variant="secondary" className="capitalize text-xs font-medium">
                      Level: {parsedData.experienceLevel}
                    </Badge>
                  )}
                  {parsedData?.salary && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium text-success bg-success/10 border-success/30"
                    >
                      💰 {parsedData.salary}
                    </Badge>
                  )}
                  {parsedData?.location && (
                    <Badge variant="outline" className="text-xs">
                      📍 {parsedData.location}
                    </Badge>
                  )}
                  {parsedData?.employmentType && (
                    <Badge variant="outline" className="text-xs">
                      💼 {parsedData.employmentType}
                    </Badge>
                  )}
                  {parsedData?.requirements && parsedData.requirements.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {parsedData.requirements.length} Requirements
                    </Badge>
                  )}
                  {parsedData?.responsibilities && parsedData.responsibilities.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {parsedData.responsibilities.length} Responsibilities
                    </Badge>
                  )}
                  {parsedData?.benefits && parsedData.benefits.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {parsedData.benefits.length} Benefits
                    </Badge>
                  )}
                  {parsedData?.careerGrowth && parsedData.careerGrowth.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {parsedData.careerGrowth.length} Growth Steps
                    </Badge>
                  )}
                </div>
              </div>

              {/* Skills Badges */}
              {parsedData?.detectedSkills && parsedData.detectedSkills.length > 0 && (
                <div className="space-y-1.5 bg-muted/40 p-2.5 rounded-lg border border-border/60">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Detected Skills &amp; Technologies:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedData.detectedSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-[11px] font-normal">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="extracted-company" className="text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    Company Name
                  </Label>
                  <Input
                    id="extracted-company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="extracted-title" className="text-xs flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    Job Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="extracted-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="extracted-url" className="text-xs flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Job Posting URL (optional)
                </Label>
                <Input
                  id="extracted-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/jobs/view/..."
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="extracted-description"
                  className="text-xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  Cleaned Description
                </Label>
                <Textarea
                  id="extracted-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key Responsibilities and Requirements..."
                  rows={5}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="extracted-custom-prompt"
                  className="text-xs flex items-center gap-1.5"
                >
                  <MessageSquareText className="w-3.5 h-3.5 text-muted-foreground" />
                  Suggested Custom Prompt
                </Label>
                <Textarea
                  id="extracted-custom-prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Guidance for tailoring resume for this role..."
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-muted/30 border-t border-border flex items-center justify-between sm:justify-between">
          <Button type="button" variant="outline" onClick={handleClose}>
            Close / Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAddJob}
            disabled={!isParsed || !title.trim()}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Add to Target Jobs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
