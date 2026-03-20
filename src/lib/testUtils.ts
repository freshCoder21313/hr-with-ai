import { vi } from 'vitest';
import { Interview, Message, Resume, UserSettings, InterviewStatus } from '@/types';
import { ResumeData } from '@/types/resume';

export const createMockAIResponse = (text: string) => ({
  text,
  usage: { promptTokens: 10, completionTokens: 20 },
});

export const createMockAIService = (response?: string) => ({
  generateText: vi.fn().mockResolvedValue(createMockAIResponse(response || '')),
  streamText: vi.fn().mockImplementation(async function* () {
    if (response) yield response;
  }),
  ask: vi.fn().mockResolvedValue(createMockAIResponse(response || '')),
});

export const createMockInterview = (overrides?: Partial<Interview>): Interview => ({
  id: 1,
  createdAt: Date.now(),
  company: 'Test Company',
  jobTitle: 'Software Engineer',
  interviewerPersona: 'Technical Lead',
  jobDescription: 'Test job description',
  resumeText: 'Test resume',
  language: 'en-US',
  difficulty: 'medium',
  mode: 'text',
  type: 'standard',
  companyStatus: 'Standard Hiring',
  interviewContext: 'Video Call',
  status: InterviewStatus.CREATED,
  messages: [],
  ...overrides,
});

export const createMockMessage = (overrides?: Partial<Message>): Message => ({
  role: 'user',
  content: 'Test message',
  timestamp: Date.now(),
  ...overrides,
});

export const createMockResume = (overrides?: Partial<Resume>): Resume => ({
  id: 1,
  createdAt: Date.now(),
  fileName: 'test-resume.pdf',
  rawText: 'Test resume content',
  formatted: true,
  ...overrides,
});

export const createMockUserSettings = (overrides?: Partial<UserSettings>): UserSettings => ({
  id: 1,
  apiKey: 'test-api-key',
  defaultModel: 'gemini-2.0-flash',
  hintsEnabled: false,
  autoFinishEnabled: false,
  ...overrides,
});

export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockIntersectionObserver = () => {
  vi.fn().mockImplementation((callback) => {
    callback([{ isIntersecting: true }]);
    return { disconnect: vi.fn() };
  });
};
