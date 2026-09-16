export interface JobRecommendation {
  id: string;
  title: string;
  company: string;
  industry: string;
  location: string;
  salaryRange: string;
  keyRequirements: string[];
  whyItFits: string; // Why this job fits the user's CV
  matchScore: number; // 0-100
  jobDescription: string;
  tailoredResumeId?: number; // ID of the generated tailored resume
}

export interface JobSelectionState {
  selectedResumeId?: number;
  recommendations: JobRecommendation[];
  selectedJob?: JobRecommendation;
  isGenerating: boolean;
  status: 'idle' | 'analyzing' | 'generating' | 'completed';
}

export interface SavedJob {
  id?: number;
  company: string;
  jobTitle: string;
  jobDescription: string;
  interviewerPersona: string;
  companyStatus?: string;
  interviewContext?: string;
  createdAt: number;
  updatedAt: number;
}
