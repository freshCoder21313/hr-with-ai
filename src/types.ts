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
  status: InterviewStatus;
  messages: Message[];
  code?: string;
  whiteboard?: string; // JSON string of tldraw store
  feedback?: InterviewFeedback;
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
}

export interface UserSettings {
  id?: number;
  apiKey?: string;
  defaultModel?: string;
  voiceEnabled?: boolean;
  hintsEnabled?: boolean;
  baseUrl?: string;
  modelId?: string;
}

export interface Resume {
  id?: number;
  createdAt: number;
  fileName: string;
  rawText: string;
  parsedData?: any;
}