import { describe, it, expect } from 'vitest';
import { compressResumeData, decompressResumeData } from './resumeCompression';
import { ResumeData } from '@/types/resume';

const sample: ResumeData = {
  basics: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    summary: 'Mathematician',
  },
  work: [
    {
      name: 'Analytical Engines Ltd',
      position: 'Engineer',
      startDate: '1840',
      highlights: ['First programmer'],
    },
  ],
  education: [],
  skills: [{ name: 'Math', keywords: ['calculus'] }],
  projects: [],
};

describe('resumeCompression', () => {
  it('round-trips parsed resume data', () => {
    const compressed = compressResumeData(sample);
    expect(compressed).toBeTruthy();
    expect(typeof compressed).toBe('string');
    expect(compressed!.length).toBeGreaterThan(0);

    const restored = decompressResumeData(compressed!);
    expect(restored).toEqual(sample);
  });

  it('returns undefined for corrupt compressed input', () => {
    expect(decompressResumeData('not-valid-lz-data')).toBeUndefined();
  });

  it('handles empty-ish structures', () => {
    const empty: ResumeData = {
      basics: { name: '' },
      work: [],
      education: [],
      skills: [],
      projects: [],
    };
    const compressed = compressResumeData(empty);
    expect(decompressResumeData(compressed!)).toEqual(empty);
  });
});
