import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntryCardShell } from './SectionForms/entry-list.shared';
import { ResumeFactAttributionModal } from '@/features/career-knowledge/components/ResumeFactAttributionModal';
import { careerKnowledgeRepository } from '@/services/careerKnowledge/repository';
import { db } from '@/lib/db';

describe('Resume Fact Attribution Integration', () => {
  beforeEach(async () => {
    await db.transaction(
      'rw',
      [db.careerProfiles, db.careerFacts, db.careerEvidence, db.factEvidenceLinks, db.careerNotes],
      async () => {
        await db.careerProfiles.clear();
        await db.careerFacts.clear();
        await db.careerEvidence.clear();
        await db.factEvidenceLinks.clear();
        await db.careerNotes.clear();
      }
    );
  });

  it('renders attribution badge on entry card shell and opens modal with fact provenance', async () => {
    const profile = await careerKnowledgeRepository.createProfile();

    const fact = await careerKnowledgeRepository.createFact({
      profileId: profile.id,
      category: 'experience',
      subject: 'Acme Systems',
      claim: 'Lead distributed systems architect at Acme Systems',
      origin: 'user',
      verificationState: 'needs_confirmation',
    });
    await careerKnowledgeRepository.confirmFact(fact.id, 'user');

    const evidence = await careerKnowledgeRepository.createEvidence({
      profileId: profile.id,
      sourceType: 'user',
      sourceRef: 'interview-q1',
      excerpt: 'Led migration of monolith to microservices',
    });
    await careerKnowledgeRepository.linkEvidenceToFact(fact.id, evidence.id, 'supports');

    render(
      <EntryCardShell title="Acme Systems" derivedFromFactIds={[fact.id]}>
        <div>Work experience content</div>
      </EntryCardShell>
    );

    // Attribution button should be rendered
    const badge = screen.getByRole('button', { name: /From Career Knowledge/i });
    expect(badge).toBeInTheDocument();

    // Click to open attribution modal
    fireEvent.click(badge);

    expect(await screen.findByText('Career Knowledge Provenance')).toBeInTheDocument();
    expect(
      await screen.findByText(/"Lead distributed systems architect at Acme Systems"/i)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/"Led migration of monolith to microservices"/i)
    ).toBeInTheDocument();
  });

  it('handles missing or deleted fact IDs gracefully without crashing', async () => {
    render(
      <ResumeFactAttributionModal
        factIds={['non-existent-fact-id-123']}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(await screen.findByText('Career Knowledge Provenance')).toBeInTheDocument();
    expect(screen.getByText('Source Fact Not Found')).toBeInTheDocument();
    expect(screen.getByText(/non-existent-fact-id-123/i)).toBeInTheDocument();
  });
});
