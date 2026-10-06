import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/lib/db';
import { VerificationBadge } from './components/VerificationBadge';
import { SyncStatusBadge } from './components/SyncStatusBadge';
import { CandidateReviewCard } from './components/CandidateReviewCard';
import { QuestionClarificationCard } from './components/QuestionClarificationCard';
import { careerKnowledgeRepository } from '@/services/careerKnowledge/repository';
import { careerKnowledgeAppService } from '@/services/careerKnowledge/careerKnowledgeAppService';
import type { CareerFact, KnowledgeGap, QuestionPlan } from '@/types/careerKnowledge';

describe('Career Knowledge UX Components', () => {
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

  describe('Truth-State Clarity & Verification Badges', () => {
    it('renders all four distinct truth states with clear text and non-color icons', () => {
      const { rerender } = render(<VerificationBadge state="confirmed" />);
      expect(screen.getByText('Confirmed')).toBeInTheDocument();

      rerender(<VerificationBadge state="needs_confirmation" />);
      expect(screen.getByText('Needs confirmation')).toBeInTheDocument();

      rerender(<VerificationBadge state="observed" />);
      expect(screen.getByText('Observed')).toBeInTheDocument();

      rerender(<VerificationBadge state="rejected" />);
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  describe('Sync Status UX & Badges', () => {
    it('renders distinct sync status badges including unknown outcome', () => {
      const { rerender } = render(<SyncStatusBadge status="success" />);
      expect(screen.getByText('Synced')).toBeInTheDocument();

      rerender(<SyncStatusBadge status="syncing" />);
      expect(screen.getByText('Syncing...')).toBeInTheDocument();

      rerender(<SyncStatusBadge status="unknown_outcome" />);
      expect(screen.getByText(/Outcome Unconfirmed \(Safe to retry\)/i)).toBeInTheDocument();

      rerender(<SyncStatusBadge status="retryable_error" />);
      expect(screen.getByText(/Temporary Network Issue \(Retryable\)/i)).toBeInTheDocument();

      rerender(<SyncStatusBadge status="auth_failure" />);
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });
  });

  describe('Candidate Review Card', () => {
    it('renders candidate fact details and handles confirm and reject actions', async () => {
      const profile = await careerKnowledgeRepository.createProfile();
      const candidate: CareerFact = {
        id: 'candidate-1',
        profileId: profile.id,
        category: 'experience',
        subject: 'Acme Corp',
        claim: 'Staff Software Engineer leading architecture modernization',
        origin: 'user',
        verificationState: 'needs_confirmation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const onConfirm = vi.fn().mockResolvedValue(undefined);
      const onReject = vi.fn().mockResolvedValue(undefined);

      const { rerender } = render(
        <CandidateReviewCard candidate={candidate} onConfirm={onConfirm} onReject={onReject} />
      );

      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(
        screen.getByText(/Staff Software Engineer leading architecture modernization/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Needs confirmation')).toBeInTheDocument();

      // Click confirm
      const confirmBtn = screen.getByRole('button', { name: /Confirm candidate "Acme Corp"/i });
      fireEvent.click(confirmBtn);
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(candidate);
      });

      // Click reject
      rerender(
        <CandidateReviewCard candidate={candidate} onConfirm={onConfirm} onReject={onReject} />
      );
      const rejectBtn = screen.getByRole('button', { name: /Reject candidate "Acme Corp"/i });
      fireEvent.click(rejectBtn);
      await waitFor(() => {
        expect(onReject).toHaveBeenCalledWith(candidate);
      });
    });
  });

  describe('Question Clarification Flow & Skip Handling', () => {
    it('allows skipping a clarification question and submitting an answer', async () => {
      const profile = await careerKnowledgeRepository.createProfile();
      const gap: KnowledgeGap = {
        id: 'gap-1',
        requirementKey: 'cloud_k8s',
        requirement: {
          key: 'cloud_k8s',
          category: 'skill',
          description: 'Kubernetes orchestration',
        },
        type: 'missing',
        description: 'Missing verified Kubernetes experience',
        matchingFacts: [],
      };
      const plan: QuestionPlan = {
        gapId: 'gap-1',
        requirementKey: 'cloud_k8s',
        reason: 'Missing Kubernetes experience',
        questionType: 'provide_new_fact',
        targetFactShape: {
          category: 'skill',
          subject: 'Kubernetes',
          claim: 'Experience with Kubernetes cluster management',
        },
      };

      let skipped = false;
      let answered = false;

      vi.spyOn(careerKnowledgeAppService, 'generateQuestionWording').mockResolvedValueOnce({
        plan,
        question: 'Can you describe your experience with Kubernetes cluster management?',
        answerShape: 'Role, cluster scale, and tools used',
        rationale: 'Gap resolution for Kubernetes requirement',
      });

      vi.spyOn(careerKnowledgeAppService, 'submitUserAnswer').mockResolvedValueOnce({
        candidateFacts: [
          {
            id: 'cand-k8s',
            profileId: profile.id,
            category: 'skill',
            subject: 'Kubernetes',
            claim: 'Managed multi-tenant Kubernetes clusters on AWS EKS with ArgoCD',
            origin: 'user',
            verificationState: 'needs_confirmation',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        evidence: [
          {
            id: 'ev-k8s',
            profileId: profile.id,
            sourceType: 'user',
            capturedAt: new Date().toISOString(),
            excerpt: 'Managed multi-tenant Kubernetes clusters on AWS EKS with ArgoCD',
          },
        ],
        links: [],
      });

      render(
        <QuestionClarificationCard
          profileId={profile.id}
          gap={gap}
          plan={plan}
          onSkip={() => {
            skipped = true;
          }}
          onAnswered={() => {
            answered = true;
          }}
        />
      );

      expect(screen.getByText('Missing verified Kubernetes experience')).toBeInTheDocument();
      const skipBtn = screen.getByRole('button', { name: /Skip for Now/i });
      fireEvent.click(skipBtn);
      expect(skipped).toBe(true);

      const generateBtn = screen.getByRole('button', { name: /Generate Question/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByLabelText(/Your Answer/i)).toBeInTheDocument();
      });

      const answerInput = screen.getByLabelText(/Your Answer/i);
      fireEvent.change(answerInput, {
        target: { value: 'Managed multi-tenant Kubernetes clusters on AWS EKS with ArgoCD' },
      });

      const submitBtn = screen.getByRole('button', { name: /Submit Answer/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Answer Recorded and Normalized/i)).toBeInTheDocument();
      });
      expect(answered).toBe(true);
    });
  });
});
