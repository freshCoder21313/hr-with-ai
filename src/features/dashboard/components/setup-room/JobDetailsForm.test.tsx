import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JobDetailsForm } from './JobDetailsForm';
import { mapExperienceLevelToDifficulty } from '@/services/jobs/jdParser';
import { SetupFormData } from '@/types';

const defaultFormData: SetupFormData = {
  company: '',
  jobTitle: '',
  interviewerPersona: 'Alex persona',
  jobDescription: '',
  resumeText: '',
  language: 'en-US',
  difficulty: 'medium',
  type: 'standard',
  mode: 'hybrid',
  companyStatus: 'Growing',
  interviewContext: 'Video Call',
  isPanel: false,
};

const sampleRawJD = `
# Senior Backend Engineer
Company: Stripe

About Stripe:
Stripe builds economic infrastructure for the internet.

Key Responsibilities:
- Build high-availability microservices in Go and Java.
- Scale PostgreSQL databases and Redis caching.

Requirements:
- 5+ years backend engineering experience.
- Deep expertise in Distributed Systems, Kafka, and Docker.
`;

describe('JobDetailsForm - Quick Auto-fill from Raw JD', () => {
  it('correctly maps experience levels to difficulty', () => {
    expect(mapExperienceLevelToDifficulty('intern')).toBe('easy');
    expect(mapExperienceLevelToDifficulty('fresher')).toBe('easy');
    expect(mapExperienceLevelToDifficulty('junior')).toBe('easy');
    expect(mapExperienceLevelToDifficulty('mid')).toBe('medium');
    expect(mapExperienceLevelToDifficulty('senior')).toBe('hard');
    expect(mapExperienceLevelToDifficulty('lead')).toBe('hardcore');
    expect(mapExperienceLevelToDifficulty('manager')).toBe('hardcore');
    expect(mapExperienceLevelToDifficulty(undefined)).toBe('medium');
  });

  it('renders Quick Auto-fill accordion collapsed by default and expands on click', () => {
    render(
      <JobDetailsForm
        formData={defaultFormData}
        selectedJobId="new"
        savedJobs={[]}
        isResearching={false}
        onSelectSavedJob={vi.fn()}
        onSaveJob={vi.fn()}
        onDeleteJob={vi.fn()}
        onResearchCompany={vi.fn()}
        onTogglePanel={vi.fn()}
        onChange={vi.fn()}
      />
    );

    const accordionBtn = screen.getByRole('button', { name: /Quick Auto-fill from Raw JD/i });
    expect(accordionBtn).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Paste raw JD text here/i)).not.toBeInTheDocument();

    fireEvent.click(accordionBtn);
    expect(screen.getByPlaceholderText(/Paste raw JD text here/i)).toBeInTheDocument();
  });

  it('parses raw JD and auto-fills companyName, jobTitle, description, requirements, and mapped difficulty', () => {
    const onChange = vi.fn();
    const onAutoFillFromRawJD = vi.fn();

    render(
      <JobDetailsForm
        formData={defaultFormData}
        selectedJobId="new"
        savedJobs={[]}
        isResearching={false}
        onSelectSavedJob={vi.fn()}
        onSaveJob={vi.fn()}
        onDeleteJob={vi.fn()}
        onResearchCompany={vi.fn()}
        onTogglePanel={vi.fn()}
        onChange={onChange}
        onAutoFillFromRawJD={onAutoFillFromRawJD}
      />
    );

    // Expand accordion
    fireEvent.click(screen.getByRole('button', { name: /Quick Auto-fill from Raw JD/i }));

    const textarea = screen.getByPlaceholderText(/Paste raw JD text here/i);
    fireEvent.change(textarea, { target: { value: sampleRawJD } });

    const autoFillBtn = screen.getByRole('button', { name: /^Auto-fill$/i });
    expect(autoFillBtn).toBeEnabled();
    fireEvent.click(autoFillBtn);

    // Check onAutoFillFromRawJD was called
    expect(onAutoFillFromRawJD).toHaveBeenCalledWith(
      expect.objectContaining({
        company: 'Stripe',
        title: 'Senior Backend Engineer',
        experienceLevel: 'senior',
      })
    );

    // Check onChange calls for individual fields
    const changeCalls = onChange.mock.calls.map((call) => call[0].target);

    // company / companyName
    expect(changeCalls).toContainEqual(
      expect.objectContaining({ name: 'company', value: 'Stripe' })
    );
    expect(changeCalls).toContainEqual(
      expect.objectContaining({ name: 'companyName', value: 'Stripe' })
    );

    // jobTitle
    expect(changeCalls).toContainEqual(
      expect.objectContaining({ name: 'jobTitle', value: 'Senior Backend Engineer' })
    );

    // jobDescription
    expect(changeCalls).toContainEqual(
      expect.objectContaining({
        name: 'jobDescription',
        value: expect.stringContaining('Build high-availability microservices'),
      })
    );

    // requirements
    expect(changeCalls).toContainEqual(
      expect.objectContaining({
        name: 'requirements',
        value: expect.stringContaining('5+ years backend engineering experience'),
      })
    );

    // experienceLevel
    expect(changeCalls).toContainEqual(
      expect.objectContaining({ name: 'experienceLevel', value: 'senior' })
    );

    // difficulty mapped to 'hard' for senior
    expect(changeCalls).toContainEqual(
      expect.objectContaining({ name: 'difficulty', value: 'hard' })
    );

    // Check badges rendered in UI
    expect(screen.getByText(/Level: senior/i)).toBeInTheDocument();
    expect(screen.getByText(/2 requirements/i)).toBeInTheDocument();
  });

  it('does not overwrite company with "Target Company" if company is unknown', () => {
    const onChange = vi.fn();
    const unknownCompanyJD = `
# Junior QA Tester
Requirements:
- Manual testing experience.
    `;

    render(
      <JobDetailsForm
        formData={{ ...defaultFormData, company: 'My Existing Company' }}
        selectedJobId="new"
        savedJobs={[]}
        isResearching={false}
        onSelectSavedJob={vi.fn()}
        onSaveJob={vi.fn()}
        onDeleteJob={vi.fn()}
        onResearchCompany={vi.fn()}
        onTogglePanel={vi.fn()}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Quick Auto-fill from Raw JD/i }));
    fireEvent.change(screen.getByPlaceholderText(/Paste raw JD text here/i), {
      target: { value: unknownCompanyJD },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Auto-fill$/i }));

    const changeCalls = onChange.mock.calls.map((call) => call[0].target);
    const companyCalls = changeCalls.filter((c) => c.name === 'company' || c.name === 'companyName');
    expect(companyCalls).toHaveLength(0); // Should not overwrite existing company
  });
});
