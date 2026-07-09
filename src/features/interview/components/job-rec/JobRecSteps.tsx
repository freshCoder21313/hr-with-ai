import React from 'react';
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
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingButton } from '@/components/ui/loading-button';
import { Resume, JobRecommendation } from '@/types';

interface ResumeSelectStepProps {
  availableResumes: Resume[];
  selectedResume: Resume | null;
  onSelect: (resume: Resume) => void;
  onClose: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const ResumeSelectStep: React.FC<ResumeSelectStepProps> = ({
  availableResumes,
  selectedResume,
  onSelect,
  onClose,
  onGenerate,
  isGenerating,
}) => (
  <div className="space-y-6">
    <p className="text-muted-foreground">
      Select a resume to generate personalized job recommendations
    </p>
    <div className="space-y-3">
      {availableResumes.length === 0 ? (
        <Alert>
          <AlertDescription>No resumes found. Please upload a resume first.</AlertDescription>
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
            onClick={() => onSelect(resume)}
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
              {selectedResume?.id === resume.id && <CheckCircle className="w-5 h-5 text-primary" />}
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
          onClick={onGenerate}
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
);

export const AnalyzingStep: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="space-y-6">
    <div className="text-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 mx-auto">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
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
  </div>
);

interface JobResultsStepProps {
  jobs: JobRecommendation[];
  selectedJob: JobRecommendation | null;
  error: string | null;
  onBack: () => void;
  onSelect: (job: JobRecommendation) => void;
}

export const JobResultsStep: React.FC<JobResultsStepProps> = ({
  jobs,
  selectedJob,
  error,
  onBack,
  onSelect,
}) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold text-foreground">Job Recommendations</h3>
      <Button variant="outline" onClick={onBack}>
        Change Resume
      </Button>
    </div>
    {error && (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {jobs.map((job) => (
        <div
          key={job.id}
          className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
            selectedJob?.id === job.id
              ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
              : 'border-border bg-card hover:border-primary/50'
          }`}
          onClick={() => onSelect(job)}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-semibold text-lg text-foreground">{job.title}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="w-4 h-4" />
                  {job.company}
                </div>
              </div>
              <Badge variant="secondary" className="ml-2">
                {job.matchScore ? `${job.matchScore}%` : 'N/A'}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {job.location}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                {job.salaryRange || 'Competitive'}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Key Requirements:</p>
              <p className="text-sm text-muted-foreground">
                {job.keyRequirements.slice(0, 3).join(', ')}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Why It Fits:</p>
              <p className="text-sm text-muted-foreground">{job.whyItFits}</p>
            </div>
            <Button className="w-full" variant={selectedJob?.id === job.id ? 'default' : 'outline'}>
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
      ))}
    </div>
  </div>
);

export const CompletedStep: React.FC<{ selectedJob: JobRecommendation }> = ({ selectedJob }) => (
  <div className="space-y-6">
    <div className="text-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 mx-auto">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
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
);
