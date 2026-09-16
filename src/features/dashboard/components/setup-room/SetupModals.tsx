import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { JobRecommendationModal } from '@/features/interview';
import { JobRecommendation } from '@/types/jobs';
import { TailorResumeModal } from '../../TailorResumeModal';
import { Resume, ResumeData } from '@/types';

interface SetupModalsProps {
  isJobModalOpen: boolean;
  onJobModalClose: () => void;
  onSelectJob: (job: JobRecommendation, tailoredResumeText: string, tailoredResumeData?: ResumeData) => Promise<void>;
  selectedResumeId?: number;
  savedResumes: Resume[];
  showMainCVCloneDialog: boolean;
  onMainCVCloneDialogChange: (open: boolean) => void;
  isCloning: boolean;
  onConfirmClone: (clone: boolean) => void;
  isTailorModalOpen: boolean;
  onTailorModalClose: () => void;
  resumeToTailor: Resume | null;
  onGenerateTailoredResume: (jobDescription: string) => Promise<void>;
}

export const SetupModals: React.FC<SetupModalsProps> = ({
  isJobModalOpen,
  onJobModalClose,
  onSelectJob,
  selectedResumeId,
  savedResumes,
  showMainCVCloneDialog,
  onMainCVCloneDialogChange,
  isCloning,
  onConfirmClone,
  isTailorModalOpen,
  onTailorModalClose,
  resumeToTailor,
  onGenerateTailoredResume,
}) => {
  return (
    <>
      <JobRecommendationModal
        isOpen={isJobModalOpen}
        onClose={onJobModalClose}
        onSelectJob={onSelectJob}
        existingResumeId={selectedResumeId}
        availableResumes={savedResumes}
      />

      <Dialog open={showMainCVCloneDialog} onOpenChange={onMainCVCloneDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Main CV?</DialogTitle>
            <DialogDescription>
              You selected your Main CV. Would you like to create a tailored copy for this interview
              or use the original?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => onConfirmClone(false)}
              disabled={isCloning}
            >
              Use Original
            </Button>
            <LoadingButton
              onClick={() => onConfirmClone(true)}
              isLoading={isCloning}
              loadingText="Cloning..."
            >
              Make a Copy & Use
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TailorResumeModal
        isOpen={isTailorModalOpen}
        onClose={onTailorModalClose}
        sourceResume={resumeToTailor}
        onGenerate={onGenerateTailoredResume}
      />
    </>
  );
};
