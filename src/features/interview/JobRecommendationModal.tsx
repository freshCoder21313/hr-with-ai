import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle,
  Search,
  Briefcase,
  Building,
  MapPin,
  DollarSign,
  Target,
  Sparkles,
} from 'lucide-react';
import { Resume, JobRecommendation } from '@/types';
import { generateJobRecommendations, generateTailoredResumeForJob } from '@/services/geminiService';
import { getStoredAIConfig } from '@/services/geminiService';
import { LoadingButton } from '@/components/ui/loading-button';

interface JobRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectJob: (job: JobRecommendation, tailoredResumeText: string) => void;
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
  const [step, setStep] = useState<'select-resume' | 'analyzing' | 'results' | 'completed'>(
    'select-resume'
  );
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [jobs, setJobs] = useState<JobRecommendation[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobRecommendation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [, setTailoredResumeText] = useState('');

  // Auto-select resume if one is provided
  useEffect(() => {
    if (isOpen && existingResumeId && availableResumes.length > 0) {
      const resume = availableResumes.find((r) => r.id === existingResumeId);
      if (resume) {
        setSelectedResume(resume);
        // Auto-start if resume is already selected
        // setStep('analyzing');
        // handleGenerateJobs();
      }
    }
  }, [isOpen, existingResumeId, availableResumes]);

  const handleGenerateJobs = async () => {
    if (!selectedResume || !selectedResume.parsedData) {
      setError('Please select a resume with parsed data');
      return;
    }

    setStep('analyzing');
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const config = getStoredAIConfig();
      if (!config.apiKey) {
        throw new Error('Please configure your API key in settings');
      }

      const generatedJobs = await generateJobRecommendations(
        selectedResume.parsedData,
        'en-US', // Could be dynamic based on user settings
        config,
        selectedResume.id
      );

      clearInterval(progressInterval);
      setProgress(100);

      // Simulate delay for better UX
      setTimeout(() => {
        setJobs(generatedJobs);
        setStep('results');
        setIsGenerating(false);
        setProgress(0);
      }, 500);
    } catch (err) {
      console.error('Error generating jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate job recommendations');
      setIsGenerating(false);
      setStep('select-resume');
    }
  };

  const handleSelectJob = async (job: JobRecommendation) => {
    setSelectedJob(job);
    setStep('completed');

    try {
      if (!selectedResume || !selectedResume.parsedData) {
        throw new Error('No resume selected');
      }

      const config = getStoredAIConfig();
      const tailoredData = await generateTailoredResumeForJob(
        selectedResume.parsedData,
        job.jobDescription,
        config
      );

      // Convert tailored resume back to text format
      // This is a simplified version - in a real app, you'd have a proper converter
      const tailoredText =
        `Tailored Resume for ${job.title} @ ${job.company}\n\n` +
        `Professional Summary:\n${tailoredData.basics.summary}\n\n` +
        `Skills: ${tailoredData.skills.map((s) => s.name).join(', ')}\n\n` +
        `Experience:\n${tailoredData.work.map((w) => `- ${w.position} at ${w.name}`).join('\n')}`;

      setTailoredResumeText(tailoredText);

      // Auto-select after a delay
      setTimeout(() => {
        onSelectJob(job, tailoredText);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error generating tailored resume:', err);
      setError('Failed to generate tailored resume. Please try selecting another job.');
      setStep('results');
    }
  };

  const formatJobRecommendationForDisplay = (job: JobRecommendation) => {
    return {
      ...job,
      keyRequirements: job.keyRequirements.slice(0, 3).join(', '),
      salaryDisplay: job.salaryRange || 'Competitive',
      matchScoreDisplay: job.matchScore ? `${job.matchScore}%` : 'N/A',
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Briefcase className="w-5 h-5 text-primary" />
            Find Job with CV
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select Resume */}
        {step === 'select-resume' && (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Select a resume to generate personalized job recommendations
            </p>

            <div className="space-y-3">
              {availableResumes.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No resumes found. Please upload a resume first.
                  </AlertDescription>
                </Alert>
              ) : (
                availableResumes.map((resume, index) => (
                  <div
                    key={resume.id || `resume-${index}`}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedResume?.id === resume.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedResume(resume)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            selectedResume?.id === resume.id
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{resume.fileName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {resume.createdAt
                              ? new Date(resume.createdAt).toLocaleDateString()
                              : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                      {selectedResume?.id === resume.id && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedResume && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <LoadingButton
                  onClick={handleGenerateJobs}
                  disabled={!selectedResume.parsedData}
                  isLoading={isGenerating}
                  loadingText="Generating..."
                  leftIcon={<Search className="w-4 h-4" />}
                >
                  Generate Jobs
                </LoadingButton>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Analyzing */}
        {step === 'analyzing' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 mx-auto">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                  <div className="relative bg-primary w-16 h-16 rounded-full flex items-center justify-center">
                    <Search className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Analyzing Your Resume</h3>
              <p className="text-muted-foreground">
                Finding the best job matches based on your skills and experience...
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-foreground">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span>Analyzing skills and experience</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75"></div>
                <span>Identifying relevant industries</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
                <span>Matching with available opportunities</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-200"></div>
                <span>Scoring and ranking matches</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Job Recommendations</h3>
              <Button variant="outline" onClick={() => setStep('select-resume')}>
                Change Resume
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job) => {
                const displayJob = formatJobRecommendationForDisplay(job);
                return (
                  <div
                    key={job.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedJob?.id === job.id
                        ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                    onClick={() => handleSelectJob(job)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-lg text-foreground">
                            {displayJob.title}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building className="w-4 h-4" />
                            {displayJob.company}
                          </div>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {displayJob.matchScoreDisplay}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {displayJob.location}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="w-4 h-4" />
                          {displayJob.salaryDisplay}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Key Requirements:</p>
                        <p className="text-sm text-muted-foreground">
                          {displayJob.keyRequirements}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Why It Fits:</p>
                        <p className="text-sm text-muted-foreground">{displayJob.whyItFits}</p>
                      </div>

                      <Button
                        className="w-full"
                        variant={selectedJob?.id === job.id ? 'default' : 'outline'}
                      >
                        {selectedJob?.id === job.id ? (
                          <>
                            <Target className="w-4 h-4 mr-2" />
                            Selected
                          </>
                        ) : (
                          'Select This Job'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Completed */}
        {step === 'completed' && selectedJob && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 mx-auto">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                  <div className="relative bg-primary w-16 h-16 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Job Selected!</h3>
              <p className="text-muted-foreground">
                Creating tailored resume for {selectedJob.title} at {selectedJob.company}...
              </p>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">Selected Job</span>
              </div>
              <h4 className="font-semibold text-lg text-foreground">{selectedJob.title}</h4>
              <p className="text-primary/80">@ {selectedJob.company}</p>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Interview form will be automatically filled with this job information
              </p>
              <div className="animate-pulse">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing interview...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JobRecommendationModal;
