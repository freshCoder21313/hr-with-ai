import { VoiceSettings } from './settings';

/** Content format of the interview (what is being assessed). */
export type InterviewContentType = 'standard' | 'coding' | 'system_design' | 'behavioral';

/** How the candidate interacts (channel). */
export type InterviewInteractionMode = 'text' | 'voice' | 'hybrid';

/**
 * @deprecated Prefer `InterviewContentType`. Kept as an alias for existing imports.
 */
export type InterviewMode = InterviewContentType;

/** Content types that may have been stored historically in `mode`. */
const CONTENT_TYPES: ReadonlySet<string> = new Set([
  'standard',
  'coding',
  'system_design',
  'behavioral',
]);

const INTERACTION_MODES: ReadonlySet<string> = new Set(['text', 'voice', 'hybrid']);

/** Resolve content type, including legacy records that put content type in `mode`. */
export function resolveInterviewContentType(
  interview: Pick<Interview, 'type' | 'mode'>
): InterviewContentType {
  if (interview.type && CONTENT_TYPES.has(interview.type)) {
    return interview.type;
  }
  if (typeof interview.mode === 'string' && CONTENT_TYPES.has(interview.mode)) {
    return interview.mode as InterviewContentType;
  }
  return 'standard';
}

/** Resolve interaction mode; defaults to text. */
export function resolveInterviewInteractionMode(
  interview: Pick<Interview, 'mode'>
): InterviewInteractionMode {
  if (typeof interview.mode === 'string' && INTERACTION_MODES.has(interview.mode)) {
    return interview.mode as InterviewInteractionMode;
  }
  return 'text';
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  image?: string; // Base64 string for multimodal input
  isError?: boolean;
  // Voice Interview Fields
  audioBlob?: Blob; // Original user audio (optional)
  audioUrl?: string; // URL blob for playback
  transcriptionConfidence?: number; // STT confidence (0-1)
  isVoiceInput?: boolean; // Mark as voice message
  action?: {
    type: 'CODE' | 'DRAW';
    language?: string; // For code
  };
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
  /** Interaction channel: text | voice | hybrid (legacy rows may store content type here). */
  mode?: InterviewInteractionMode | InterviewContentType;
  /** Content format: standard | coding | system_design | behavioral */
  type?: InterviewContentType;
  voiceSettings?: VoiceSettings;
  companyStatus?: string;
  interviewContext?: string;
  status: InterviewStatus;
  messages: Message[];
  code?: string;
  whiteboard?: string; // JSON string of tldraw store
  feedback?: InterviewFeedback;
  resumeId?: number; // ID of the resume used for this interview
  tailoredResume?: string; // Generated tailored resume text
  isPanel?: boolean; // True if it's a panel interview with multiple personas
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
  /** Content format: standard | coding | system_design | behavioral */
  type: InterviewContentType;
  /** Interaction channel: text | voice | hybrid */
  mode?: InterviewInteractionMode;
  companyStatus: string;
  interviewContext: string;
  isPanel?: boolean; // Panel Interview Mode
}
