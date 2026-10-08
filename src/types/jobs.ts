// Database row shape for persisted job recommendations.
export interface DBJobRecommendation {
  id?: number;
  interviewId: number;
  resumeId: number;
  title: string;
  company: string;
  industry?: string;
  location?: string;
  salaryRange?: string;
  keyRequirements: string; // JSON string
  whyItFits?: string;
  matchScore?: number;
  jobDescription?: string;
  tailoredResumeId?: number;
  createdAt: number;
}

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
  jobUrl?: string;
  url?: string;
  title?: string;
  description?: string;
  customPrompt?: string;
  requirements?: string[];
  responsibilities?: string[];
  experienceLevel?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Job {
  id: string;
  company: string;
  title: string;
  jobTitle?: string;
  description: string;
  jobDescription?: string;
  customPrompt: string;
  jobUrl?: string;
  url?: string;
  interviewerPersona?: string;
  companyStatus?: string;
  interviewContext?: string;
  requirements?: string[];
  responsibilities?: string[];
  experienceLevel?: string;
  createdAt?: number;
  updatedAt?: number;
}

export type RawJobInput = {
  id?: string | number | null;
  company?: string;
  jobTitle?: string;
  title?: string;
  jobDescription?: string;
  description?: string;
  customPrompt?: string;
  jobUrl?: string;
  url?: string;
  interviewerPersona?: string;
  companyStatus?: string;
  interviewContext?: string;
  requirements?: string[];
  responsibilities?: string[];
  experienceLevel?: string;
  createdAt?: number;
  updatedAt?: number;
};

/**
 * Normalizes any partial Job or SavedJob into a canonical Job format with all aliases synchronized.
 */
export function normalizeJob(raw: RawJobInput): Job {
  const company = (raw.company || '').trim();
  const jobTitle = (raw.jobTitle || raw.title || '').trim();
  const jobDescription = (raw.jobDescription || raw.description || '').trim();
  const jobUrl = (raw.jobUrl || raw.url || '').trim();
  const customPrompt = (raw.customPrompt || '').trim();
  const interviewerPersona = (raw.interviewerPersona || 'Technical Interviewer').trim();
  const now = Date.now();

  const id =
    raw.id !== undefined && raw.id !== null
      ? String(raw.id)
      : `${now}-${Math.random().toString(36).slice(2, 11)}`;

  return {
    id,
    company,
    jobTitle,
    title: jobTitle,
    jobDescription,
    description: jobDescription,
    customPrompt,
    ...(jobUrl ? { jobUrl, url: jobUrl } : {}),
    interviewerPersona,
    companyStatus: raw.companyStatus,
    interviewContext: raw.interviewContext,
    requirements: raw.requirements,
    responsibilities: raw.responsibilities,
    experienceLevel: raw.experienceLevel,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  };
}

/**
 * Converts a Job or partial SavedJob into a valid SavedJob for IndexedDB persistence.
 */
export function toSavedJob(raw: RawJobInput): SavedJob {
  const norm = normalizeJob(raw);
  const numericId = typeof raw.id === 'number' ? raw.id : parseInt(String(raw.id || ''), 10);
  const now = Date.now();

  return {
    ...(Number.isFinite(numericId) && numericId > 0 ? { id: numericId } : {}),
    company: norm.company,
    jobTitle: norm.jobTitle || norm.title,
    title: norm.title,
    jobDescription: norm.jobDescription || norm.description,
    description: norm.description,
    interviewerPersona: norm.interviewerPersona || 'Technical Interviewer',
    companyStatus: norm.companyStatus || '',
    interviewContext: norm.interviewContext || '',
    customPrompt: norm.customPrompt || '',
    ...(norm.jobUrl ? { jobUrl: norm.jobUrl, url: norm.jobUrl } : {}),
    requirements: norm.requirements,
    responsibilities: norm.responsibilities,
    experienceLevel: norm.experienceLevel,
    createdAt: norm.createdAt || now,
    updatedAt: norm.updatedAt || now,
  };
}

