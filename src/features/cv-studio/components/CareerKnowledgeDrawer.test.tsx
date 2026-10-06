import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/lib/db';
import { CareerKnowledgeDrawer } from './CareerKnowledgeDrawer';
import { careerKnowledgeRepository } from '@/services/careerKnowledge/repository';

describe('CareerKnowledgeDrawer inside CV Studio', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.transaction(
      'rw',
      [
        db.careerProfiles,
        db.careerFacts,
        db.careerEvidence,
        db.factEvidenceLinks,
        db.careerNotes,
        db.resumes,
      ],
      async () => {
        await db.careerProfiles.clear();
        await db.careerFacts.clear();
        await db.careerEvidence.clear();
        await db.factEvidenceLinks.clear();
        await db.careerNotes.clear();
        await db.resumes.clear();
      }
    );
  });

  const renderDrawer = (props: React.ComponentProps<typeof CareerKnowledgeDrawer>) =>
    render(
      <MemoryRouter>
        <CareerKnowledgeDrawer {...props} />
      </MemoryRouter>
    );

  it('renders correctly when open and displays tabs and overview metrics', async () => {
    const profile = await careerKnowledgeRepository.createProfile();

    await careerKnowledgeRepository.createFact({
      profileId: profile.id,
      category: 'skill',
      subject: 'React',
      claim: 'Proficient in React and TypeScript frontend development',
      origin: 'user',
      verificationState: 'needs_confirmation',
    });

    const onClose = vi.fn();

    renderDrawer({
      isOpen: true,
      onClose,
    });

    expect(
      await screen.findByRole('heading', { level: 2, name: /Career Knowledge/i })
    ).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: /^Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Review/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Facts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Evidence/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Questions/i })).toBeInTheDocument();
  });

  it('allows switching between tabs', async () => {
    await careerKnowledgeRepository.createProfile();

    renderDrawer({
      isOpen: true,
      onClose: vi.fn(),
    });

    // Overview is visible initially
    expect(await screen.findByText('Active Career Profile')).toBeInTheDocument();

    // Switch to Questions tab
    const questionsTab = screen.getByRole('tab', { name: /Questions/i });
    fireEvent.click(questionsTab);
    expect(await screen.findByText('Knowledge Gaps & Question Engine')).toBeInTheDocument();

    // Switch to Evidence tab
    const evidenceTab = screen.getByRole('tab', { name: /Evidence/i });
    fireEvent.click(evidenceTab);
    expect(await screen.findByText('Provenance & Evidence Records')).toBeInTheDocument();
  });

  it('allows candidate review and confirmation inside drawer', async () => {
    const profile = await careerKnowledgeRepository.createProfile();

    const candidate = await careerKnowledgeRepository.createFact({
      profileId: profile.id,
      category: 'experience',
      subject: 'Google',
      claim: 'Software Engineer at Google',
      origin: 'migration',
      verificationState: 'needs_confirmation',
    });

    const onFactUpdated = vi.fn();

    renderDrawer({
      isOpen: true,
      onClose: vi.fn(),
      onFactUpdated,
    });

    // Switch to Review tab
    const reviewTab = await screen.findByRole('tab', { name: /Review/i });
    fireEvent.click(reviewTab);

    expect(await screen.findByText('Candidate Review Queue')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();

    // Confirm candidate
    const confirmBtn = screen.getByRole('button', { name: /Confirm candidate "Google"/i });
    fireEvent.click(confirmBtn);

    await waitFor(async () => {
      const updated = await careerKnowledgeRepository.getFact(candidate.id);
      expect(updated?.verificationState).toBe('confirmed');
    });

    expect(onFactUpdated).toHaveBeenCalled();
  });

  it('opens FactDetailModal when clicking on a fact in Overview', async () => {
    const profile = await careerKnowledgeRepository.createProfile();

    const created = await careerKnowledgeRepository.createFact({
      profileId: profile.id,
      category: 'skill',
      subject: 'Docker Containerization',
      claim: 'Built multi-stage production Docker containers',
      origin: 'user',
      verificationState: 'needs_confirmation',
    });
    await careerKnowledgeRepository.confirmFact(created.id, 'user');

    renderDrawer({
      isOpen: true,
      onClose: vi.fn(),
    });

    // Find the fact item in recent activity on overview tab
    const factItem = await screen.findByText('Docker Containerization');
    expect(factItem).toBeInTheDocument();

    // Click to open detail modal
    fireEvent.click(factItem);

    // Modal dialog should appear with fact claim
    expect(await screen.findByText('Canonical Claim')).toBeInTheDocument();
    expect(screen.getAllByText('Built multi-stage production Docker containers').length).toBe(2);
  });

  it('renders nothing in DOM when isOpen is false', () => {
    renderDrawer({
      isOpen: false,
      onClose: vi.fn(),
    });

    expect(
      screen.queryByRole('heading', { level: 2, name: /Career Knowledge/i })
    ).not.toBeInTheDocument();
  });
});
