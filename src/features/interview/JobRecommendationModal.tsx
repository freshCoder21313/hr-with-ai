import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Briefcase } from 'lucide-react';
import { Resume, JobRecommendation } from '@/types';
import { ResumeData } from '@/types/resume';
import { useJobRecommendationFlow } from './hooks/useJobRecommendationFlow';
import {
  ResumeSelectStep,
  AnalyzingStep,
  JobResultsStep,
  CompletedStep,
} from './components/job-rec/JobRecSteps';

interface JobRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectJob: (
    job: JobRecommendation,
    tailoredResumeText: string,
    tailoredResumeData?: ResumeData
  ) => void;
  existingResumeId?: number;
  availableResumes?: Resume[];
  currentInterviewId?: number;
}

const JobRecommendationModal: React.FC<JobRecommendationModalProps> = ({
  isOpen,
  onClose,
  onSelectJob,
  existingResumeId,
  availableResumes = [],
  currentInterviewId: _currentInterviewId,
}) => {
  const flow = useJobRecommendationFlow({
    isOpen,
    existingResumeId,
    availableResumes,
    onSelectJob,
    onClose,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Briefcase className="w-5 h-5 text-primary" />
            Find Job with CV
          </DialogTitle>
        </DialogHeader>

        {flow.step === 'select-resume' && (
          <ResumeSelectStep
            availableResumes={availableResumes}
            selectedResume={flow.selectedResume}
            onSelect={flow.setSelectedResume}
            onClose={onClose}
            onGenerate={flow.handleGenerateJobs}
            isGenerating={flow.isGenerating}
          />
        )}
        {flow.step === 'analyzing' && <AnalyzingStep progress={flow.progress} />}
        {flow.step === 'results' && (
          <JobResultsStep
            jobs={flow.jobs}
            selectedJob={flow.selectedJob}
            error={flow.error}
            onBack={() => flow.setStep('select-resume')}
            onSelect={flow.handleSelectJob}
          />
        )}
        {flow.step === 'completed' && flow.selectedJob && (
          <CompletedStep selectedJob={flow.selectedJob} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JobRecommendationModal;
