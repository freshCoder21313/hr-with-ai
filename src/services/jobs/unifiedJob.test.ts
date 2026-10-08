import { describe, it, expect } from 'vitest';
import { normalizeJob, toSavedJob, SavedJob, Job } from '@/types/jobs';

describe('Unified Job model (CV Studio & Mock Interview parity)', () => {
  it('normalizes a job entered from Mock Interview with title/description aliases', () => {
    const mockInterviewJob: SavedJob = {
      id: 101,
      company: 'Shopee',
      jobTitle: 'Senior Backend Engineer',
      jobDescription: 'Design scalable microservices using Golang and Kubernetes.',
      interviewerPersona: 'System Architect',
      companyStatus: 'High-growth Tech',
      interviewContext: 'Distributed transactions at scale',
      jobUrl: 'https://careers.shopee.com/job/101',
      createdAt: 1700000000000,
      updatedAt: 1700000005000,
    };

    const normalized = normalizeJob(mockInterviewJob);

    // Verifies CV Studio properties match Mock Interview properties
    expect(normalized.id).toBe('101');
    expect(normalized.company).toBe('Shopee');
    expect(normalized.jobTitle).toBe('Senior Backend Engineer');
    expect(normalized.title).toBe('Senior Backend Engineer');
    expect(normalized.jobDescription).toBe(
      'Design scalable microservices using Golang and Kubernetes.'
    );
    expect(normalized.description).toBe(
      'Design scalable microservices using Golang and Kubernetes.'
    );
    expect(normalized.jobUrl).toBe('https://careers.shopee.com/job/101');
    expect(normalized.url).toBe('https://careers.shopee.com/job/101');
    expect(normalized.interviewerPersona).toBe('System Architect');
    expect(normalized.companyStatus).toBe('High-growth Tech');
    expect(normalized.interviewContext).toBe('Distributed transactions at scale');
  });

  it('normalizes a job entered from CV Studio with jobTitle/jobDescription aliases', () => {
    const cvStudioJob: Partial<Job> = {
      id: 'custom-uuid-1',
      company: 'Grab',
      title: 'Staff Frontend Engineer',
      description: 'Lead web platform architecture with React and TypeScript.',
      url: 'https://grab.careers/jobs/frontend-lead',
      customPrompt: 'Highlight experience with performance optimization and design systems.',
    };

    const normalized = normalizeJob(cvStudioJob);

    expect(normalized.id).toBe('custom-uuid-1');
    expect(normalized.company).toBe('Grab');
    expect(normalized.title).toBe('Staff Frontend Engineer');
    expect(normalized.jobTitle).toBe('Staff Frontend Engineer');
    expect(normalized.description).toBe(
      'Lead web platform architecture with React and TypeScript.'
    );
    expect(normalized.jobDescription).toBe(
      'Lead web platform architecture with React and TypeScript.'
    );
    expect(normalized.url).toBe('https://grab.careers/jobs/frontend-lead');
    expect(normalized.jobUrl).toBe('https://grab.careers/jobs/frontend-lead');
    expect(normalized.customPrompt).toBe(
      'Highlight experience with performance optimization and design systems.'
    );
    // Provides fallback persona suitable for Mock Interview
    expect(normalized.interviewerPersona).toBe('Technical Interviewer');
  });

  it('converts normalized job to SavedJob suitable for IndexedDB storage', () => {
    const job: Job = {
      id: '202',
      company: 'VinAI',
      jobTitle: 'AI Research Engineer',
      title: 'AI Research Engineer',
      jobDescription: 'Train foundation models and publish research papers.',
      description: 'Train foundation models and publish research papers.',
      customPrompt: 'Emphasize PyTorch and Transformer architecture.',
      jobUrl: 'https://vinai.io/careers/ai-engineer',
      url: 'https://vinai.io/careers/ai-engineer',
      interviewerPersona: 'Head of Research',
      createdAt: 1700000000000,
      updatedAt: 1700000005000,
    };

    const savedJob = toSavedJob(job);

    expect(savedJob.id).toBe(202);
    expect(savedJob.company).toBe('VinAI');
    expect(savedJob.jobTitle).toBe('AI Research Engineer');
    expect(savedJob.title).toBe('AI Research Engineer');
    expect(savedJob.jobDescription).toBe('Train foundation models and publish research papers.');
    expect(savedJob.description).toBe('Train foundation models and publish research papers.');
    expect(savedJob.jobUrl).toBe('https://vinai.io/careers/ai-engineer');
    expect(savedJob.url).toBe('https://vinai.io/careers/ai-engineer');
    expect(savedJob.customPrompt).toBe('Emphasize PyTorch and Transformer architecture.');
    expect(savedJob.interviewerPersona).toBe('Head of Research');
  });
});
