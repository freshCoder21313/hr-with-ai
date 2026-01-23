import { ResumeData } from './types/resume';

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  image?: string; // Base64 string for multimodal input
}

export enum InterviewStatus {
  CREATED = 'created',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

export interface Interview {
  id?: number;
  createdAt: number;
  company: string;
  jobTitle: string;
  interviewerPersona: string;
  jobDescription: string;
  resumeText: string;
  language: 'vi-VN' | 'en-US';
  difficulty?: 'easy' | 'medium' | 'hard' | 'hardcore';
  companyStatus?: string;
  interviewContext?: string;
  status: InterviewStatus;
  messages: Message[];
  code?: string;
  whiteboard?: string; // JSON string of tldraw store
  feedback?: InterviewFeedback;
  resumeId?: number; // ID of the resume used for this interview
  tailoredResume?: string; // Generated tailored resume text
}

export interface InterviewFeedback {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  keyQuestionAnalysis: Array<{
    question: string;
    analysis: string;
    improvement: string;
  }>;
  mermaidGraphCurrent: string;
  mermaidGraphPotential: string;
  recommendedResources: Array<{
    topic: string;
    description: string;
    searchQuery: string;
  }>;
}

export interface SetupFormData {
  company: string;
  jobTitle: string;
  interviewerPersona: string;
  jobDescription: string;
  resumeText: string;
  language: 'vi-VN' | 'en-US';
  difficulty: 'easy' | 'medium' | 'hard' | 'hardcore';
  companyStatus: string;
  interviewContext: string;
}

export interface UserSettings {
  id?: number;
  apiKey?: string;
  defaultModel?: string;
  voiceEnabled?: boolean;
  hintsEnabled?: boolean;
  autoFinishEnabled?: boolean;
  baseUrl?: string;
  modelId?: string;
}

export interface Resume {
  id?: number;
  createdAt: number;
  fileName: string;
  rawText: string;
  parsedData?: ResumeData; // Structured JSON Resume
  formatted?: boolean; // True if AI parsing is done
}

// Job Recommendation Interface
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

// Job Selection State (for Interview Room)
export interface JobSelectionState {
  selectedResumeId?: number;
  recommendations: JobRecommendation[];
  selectedJob?: JobRecommendation;
  isGenerating: boolean;
  status: 'idle' | 'analyzing' | 'generating' | 'completed';
}
