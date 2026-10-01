import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkSection } from './WorkSection';
import { EducationSection } from './EducationSection';
import { ProjectsSection } from './ProjectsSection';
import { ResumeData } from '@/types/resume';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const WORK: ResumeData['work'] = [
  { name: 'Acme', position: 'Backend Engineer', summary: 'First role' },
  { name: 'Globex', position: 'Staff Engineer', summary: 'Second role' },
];

const EDUCATION: ResumeData['education'] = [
  { institution: 'MIT', area: 'CS', studyType: 'BSc' },
  { institution: 'ETH', area: 'Math', studyType: 'MSc' },
];

const PROJECTS: ResumeData['projects'] = [
  { name: 'Toolkit', description: 'First project' },
  { name: 'Pipeline', description: 'Second project' },
];

describe('repeated-row inline edit names', () => {
  it('distinguishes the job titles of two experience rows', () => {
    render(<WorkSection work={WORK} onUpdate={vi.fn()} layout="minimalist" />);

    expect(
      screen.getByRole('button', { name: 'Job title, experience 1, edit' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Job title, experience 2, edit' })
    ).toBeInTheDocument();
  });

  it('distinguishes the companies of two experience rows', () => {
    render(<WorkSection work={WORK} onUpdate={vi.fn()} layout="minimalist" />);

    expect(screen.getByRole('button', { name: 'Company, experience 1, edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Company, experience 2, edit' })).toBeInTheDocument();
  });

  it('distinguishes the institutions of two education rows', () => {
    render(<EducationSection education={EDUCATION} onUpdate={vi.fn()} layout="classic" />);

    expect(
      screen.getByRole('button', { name: 'Institution, education 1, edit' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Institution, education 2, edit' })
    ).toBeInTheDocument();
  });

  it('distinguishes the descriptions of two project rows', () => {
    render(<ProjectsSection projects={PROJECTS} onUpdate={vi.fn()} layout="classic" />);

    expect(
      screen.getByRole('button', { name: 'Description, project 1, edit' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Description, project 2, edit' })
    ).toBeInTheDocument();
  });
});
