import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { db } from '@/lib/db';
import CVStudioPage from './CVStudioPage';
import { careerKnowledgeRepository } from '@/services/careerKnowledge/repository';

describe('CVStudioPage UI & Career Knowledge Integration', () => {
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

  const renderComponent = () =>
    render(
      <HelmetProvider>
        <TooltipProvider>
          <MemoryRouter initialEntries={['/studio']}>
            <CVStudioPage />
          </MemoryRouter>
        </TooltipProvider>
      </HelmetProvider>
    );

  it('renders CV Studio layout with Chat Assistant and Career Knowledge trigger', async () => {
    const profile = await careerKnowledgeRepository.createProfile();
    await careerKnowledgeRepository.createFact({
      profileId: profile.id,
      category: 'skill',
      subject: 'TypeScript',
      claim: 'Strong TypeScript and React skills',
      origin: 'user',
      verificationState: 'needs_confirmation',
    });

    renderComponent();

    // Verify Chat Assistant and Career Knowledge button are present
    expect(await screen.findByText('Chat Assistant')).toBeInTheDocument();
    const ckButtons = await screen.findAllByRole('button', { name: /Career Knowledge/i });
    expect(ckButtons.length).toBeGreaterThan(0);

    // Click to open drawer
    fireEvent.click(ckButtons[0]);

    // Career Knowledge Drawer should open
    expect(
      await screen.findByRole('heading', { level: 2, name: /Career Knowledge/i })
    ).toBeInTheDocument();
  });

  it('switches active mobile tab when receiving tour:switch-mobile-tab event', async () => {
    renderComponent();

    // Default mobile tab is 'chat'
    expect(await screen.findByRole('tab', { name: /^chat$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('tab', { name: /^jobs$/i })).toHaveAttribute('aria-pressed', 'false');

    // Dispatch tour event to switch to 'jobs' tab
    fireEvent(
      window,
      new CustomEvent('tour:switch-mobile-tab', {
        detail: { tab: 'jobs' },
      })
    );

    // Jobs tab button should now be pressed/active
    expect(screen.getByRole('tab', { name: /^jobs$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: /^chat$/i })).toHaveAttribute('aria-pressed', 'false');

    // Dispatch tour event to switch to 'preview' tab
    fireEvent(
      window,
      new CustomEvent('tour:switch-mobile-tab', {
        detail: { tab: 'preview' },
      })
    );

    expect(screen.getByRole('tab', { name: /^preview$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('tab', { name: /^jobs$/i })).toHaveAttribute('aria-pressed', 'false');
  });
});
