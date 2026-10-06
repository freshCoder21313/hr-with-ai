import React, { useState } from 'react';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wand2 } from 'lucide-react';
import { isNonEmptyString } from '@/lib/validation';
import { Resume } from '@/types';
import { LoadingButton } from '@/components/ui/loading-button';

interface TailorResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceResume: Resume | null;
  initialJobDescription?: string;
  onGenerate: (jobDescription: string) => Promise<void>;
}
export const TailorResumeModal: React.FC<TailorResumeModalProps> = ({
  isOpen,
  onClose,
  sourceResume,
  initialJobDescription = '',
  onGenerate,
}) => {
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync when initialJobDescription changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setJobDescription(initialJobDescription);
    }
  }, [isOpen, initialJobDescription]);

  if (!sourceResume) return null;

  const handleGenerate = async () => {
    if (!isNonEmptyString(jobDescription)) return;

    setIsProcessing(true);
    try {
      await onGenerate(jobDescription);
      setJobDescription('');
      onClose();
    } catch (error) {
      // Keep the modal open with the JD intact so the user can retry.
      logger.error('Failed to tailor resume:', error);
      toast.error('Failed to tailor resume: ' + getErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_open) => !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Tailor Resume to Job
          </DialogTitle>
          <DialogDescription>
            Create a specialized version of <strong>{sourceResume.fileName}</strong> optimized for a
            specific Job Description.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="jd">Job Description (JD)</Label>
            <Textarea
              id="jd"
              placeholder="Paste the full job description here..."
              className="min-h-[200px]"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            onClick={handleGenerate}
            disabled={!isNonEmptyString(jobDescription)}
            isLoading={isProcessing}
            loadingText="Tailoring..."
            leftIcon={<Wand2 className="h-4 w-4" />}
          >
            Generate New CV
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
