import React, { useState } from 'react';
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
import { Wand2, Loader2 } from 'lucide-react';
import { Resume } from '@/types';

interface TailorResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceResume: Resume | null;
  onGenerate: (jobDescription: string) => Promise<void>;
}

export const TailorResumeModal: React.FC<TailorResumeModalProps> = ({
  isOpen,
  onClose,
  sourceResume,
  onGenerate,
}) => {
  const [jobDescription, setJobDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!sourceResume) return null;

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return;

    setIsProcessing(true);
    try {
      await onGenerate(jobDescription);
      setJobDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to tailor resume:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_open) => !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
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
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!jobDescription.trim() || isProcessing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tailoring...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate New CV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
