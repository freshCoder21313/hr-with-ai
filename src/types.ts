import { ResumeData } from './types/resume';

export type InterviewMode = 'standard' | 'coding' | 'system_design' | 'behavioral';

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  image?: string; // Base64 string for multimodal input
}

export enum InterviewStatus {
  CREATED = 'created',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface Interview {
  id?: number;
  createdAt: number;
  updatedAt?: number; // Added for sync merging
  company: string;
  jobTitle: string;
  interviewerPersona: string;
  jobDescription: string;
  resumeText: string;
  language: 'vi-VN' | 'en-US';
  difficulty?: 'easy' | 'medium' | 'hard' | 'hardcore';
  mode?: InterviewMode;
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
  resilienceScore?: number; // 0-10 for Hardcore mode
  cultureFitScore?: number; // 0-10 based on Company Status
  badges?: string[]; // E.g., "Survivor", "Culture Fit King"
}

export interface SetupFormData {
  company: string;
  jobTitle: string;
  interviewerPersona: string;
  jobDescription: string;
  resumeText: string;
  language: 'vi-VN' | 'en-US';
  difficulty: 'easy' | 'medium' | 'hard' | 'hardcore';
  mode: InterviewMode;
  companyStatus: string;
  interviewContext: string;
}

export interface UserSettings {
  id?: number;
  updatedAt?: number; // Added for sync merging
  apiKey?: string;
  githubUsername?: string;
  githubToken?: string;
  defaultModel?: string;
  voiceEnabled?: boolean;
  hintsEnabled?: boolean;
  autoFinishEnabled?: boolean;
  baseUrl?: string;
  modelId?: string;
  provider?: AIModelProvider;
}

export interface Resume {
  id?: number;
  createdAt: number;
  updatedAt?: number; // Added for sync merging
  fileName: string;
  rawText: string;
  parsedData?: ResumeData; // Structured JSON Resume
  formatted?: boolean; // True if AI parsing is done
  analysisResult?: ResumeAnalysis;
  analyzedJobDescription?: string;
  isMain?: boolean; // True if this is the Main CV
}

export interface ResumeAnalysis {
  matchScore: number;
  summary: string;
  missingKeywords: string[];
  improvements: string[];
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

export type AIModelProvider = 'google' | 'openai' | 'anthropic' | 'openrouter';

export interface AIConfig {
  apiKey: string;
  baseUrl?: string;
  modelId?: string;
  provider: AIModelProvider;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
  image?: string; // Base64 string for multimodal
}

export interface AIResponse {
  text: string;
  usage?: { promptTokens: number; completionTokens: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawResponse?: any;
}

export interface AIRequestOptions {
  temperature?: number;
  jsonMode?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: any; // For structured output
  systemInstruction?: string;
  modelId?: string; // Allow overriding model per request
}

export interface AIProviderStrategy {
  generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse>;
  streamText(messages: ChatMessage[], options?: AIRequestOptions): AsyncIterable<string>;
}
