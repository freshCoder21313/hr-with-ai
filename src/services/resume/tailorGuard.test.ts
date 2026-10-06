import { describe, expect, it } from 'vitest';
import { assertTailorFaithful, diffTailorOutput, filterFaithfulResume } from './tailorGuard';
import type { ResumeData } from '../../types/resume';

const base = (): ResumeData => ({
  basics: { name: 'Nam Nguyen', label: 'Frontend Engineer', email: 'nam@example.com' },
  work: [
    {
      name: 'Acme Corp',
      position: 'Frontend Engineer',
      startDate: '2022-01',
      highlights: ['Built UI'],
    },
    { name: 'Globex', position: 'Junior Developer', startDate: '2020-01' },
  ],
  education: [{ institution: 'HUST', area: 'Computer Science', studyType: 'Bachelor' }],
  skills: [{ name: 'React', level: 'Advanced' }, { name: 'TypeScript' }],
  projects: [{ name: 'Portfolio', description: 'Personal site' }],
});

describe('tailorGuard', () => {
  it('accepts a tailored resume that only rewrites source entities', () => {
    const source = base();
    const tailored: ResumeData = {
      ...source,
      basics: { ...source.basics, label: 'Frontend Engineer for Fintech' },
      work: source.work.map((w) => ({ ...w, summary: 'Tailored summary for ' + w.name })),
    };

    const result = assertTailorFaithful(source, tailored);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(filterFaithfulResume(source, tailored)).toEqual(tailored);
  });

  it('flags a fabricated work entry and filters it out', () => {
    const source = base();
    const tailored: ResumeData = {
      ...source,
      work: [...source.work, { name: 'Initech', position: 'CTO', startDate: '2015-01' }],
    };

    const issues = diffTailorOutput(source, tailored);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe('work');
    expect(issues[0].detail).toContain('Initech');

    const filtered = filterFaithfulResume(source, tailored);
    expect(filtered.work).toHaveLength(2);
    expect(filtered.work.map((w) => w.name)).toEqual(['Acme Corp', 'Globex']);
    expect(assertTailorFaithful(source, tailored).valid).toBe(false);
  });

  it('flags a fabricated skill and removes it', () => {
    const source = base();
    const tailored: ResumeData = { ...source, skills: [...source.skills, { name: 'Kubernetes' }] };

    const { valid, issues } = assertTailorFaithful(source, tailored);
    expect(valid).toBe(false);
    expect(issues[0].kind).toBe('skill');
    expect(filterFaithfulResume(source, tailored).skills.map((s) => s.name)).toEqual([
      'React',
      'TypeScript',
    ]);
  });

  it('flags a fabricated project and removes it', () => {
    const source = base();
    const tailored: ResumeData = {
      ...source,
      projects: [{ name: 'Portfolio' }, { name: 'Blockchain Wallet' }],
    };

    const { valid, issues } = assertTailorFaithful(source, tailored);
    expect(valid).toBe(false);
    expect(issues[0].kind).toBe('project');
    expect(filterFaithfulResume(source, tailored).projects.map((p) => p.name)).toEqual([
      'Portfolio',
    ]);
  });

  it('flags a fabricated education entry and removes it', () => {
    const source = base();
    const tailored: ResumeData = {
      ...source,
      education: [
        ...source.education,
        { institution: 'Stanford', area: 'MBA', studyType: 'Master' },
      ],
    };

    const { valid, issues } = assertTailorFaithful(source, tailored);
    expect(valid).toBe(false);
    expect(issues[0].kind).toBe('education');
    expect(filterFaithfulResume(source, tailored).education.map((e) => e.institution)).toEqual([
      'HUST',
    ]);
  });

  it('does not flag additions when the source section is empty', () => {
    const source: ResumeData = { ...base(), projects: [] };
    const tailored: ResumeData = { ...source, projects: [{ name: 'New Side Project' }] };

    const result = assertTailorFaithful(source, tailored);
    expect(result.valid).toBe(true);
    expect(filterFaithfulResume(source, tailored).projects).toHaveLength(1);
  });

  it('matches entries despite case and whitespace differences', () => {
    const source = base();
    const tailored: ResumeData = {
      ...source,
      work: [{ name: '  acme corp ', position: 'frontend engineer' }, source.work[1]!],
      education: [{ institution: 'HUST', area: 'computer science', studyType: 'Bachelor' }],
      skills: [{ name: ' react ' }, { name: 'typescript' }],
    };

    const result = assertTailorFaithful(source, tailored);
    expect(result.issues).toHaveLength(0);
    expect(result.valid).toBe(true);
    expect(filterFaithfulResume(source, tailored).work).toHaveLength(2);
  });

  it('keys work entries by company AND title', () => {
    const source = base();
    const tailored: ResumeData = {
      ...source,
      work: [
        { name: 'Acme Corp', position: 'Architect' },
        { name: 'Acme Corp', position: 'Frontend Engineer' },
      ],
    };

    const issues = diffTailorOutput(source, tailored);
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain('Architect');
    const kept = filterFaithfulResume(source, tailored).work;
    expect(kept.map((w) => w.position)).toEqual(['Frontend Engineer']);
  });

  it('handles missing work arrays on both sides', () => {
    const source = base();
    const tailored = { ...source, work: undefined } as unknown as ResumeData;

    const result = assertTailorFaithful(source, tailored);
    expect(result.valid).toBe(true);
    const filtered = filterFaithfulResume(source, tailored);
    expect(filtered.work).toEqual([]);
    expect(filtered.skills).toEqual(source.skills);
  });

  it('ignores non-entity field rewrites such as summary changes', () => {
    const source = base();
    const tailored: ResumeData = {
      ...source,
      work: source.work.map((w) => ({ ...w, summary: 'Totally new summary text' })),
    };

    expect(diffTailorOutput(source, tailored)).toHaveLength(0);
    expect(assertTailorFaithful(source, tailored).valid).toBe(true);
  });

  it('preserves untouched fields when filtering', () => {
    const source = base();
    const tailored: ResumeData = {
      ...source,
      languages: [{ language: 'Vietnamese', fluency: 'Native' }],
      work: [...source.work, { name: 'Initech', position: 'CTO' }],
    };

    const filtered = filterFaithfulResume(source, tailored);
    expect(filtered.languages).toEqual(tailored.languages);
    expect(filtered.work).toHaveLength(2);
    expect(filtered.basics).toEqual(tailored.basics);
  });
});
