// Career Knowledge local persistence (Phase 2).
//
// Thin repository over the existing Dexie database. It NEVER writes
// verification state from arbitrary partial input: every state-changing
// operation routes through the Phase 1 domain functions, which enforce the
// verification state machine. The repository only persists already-validated
// domain objects.
//
// Dependency direction: repository -> domain/types (+ Dexie). The domain
// layer (`careerKnowledge.ts`) must never import this file.

import type { Transaction } from 'dexie';
import { db as defaultDb } from '@/lib/db';
import type {
  Actor,
  CareerEvidence,
  CareerFact,
  CareerNote,
  CareerProfile,
  FactEvidenceLink,
  FactEvidenceRelation,
} from '@/types/careerKnowledge';
import {
  confirmCareerFact,
  createCareerEvidence,
  createCareerFact,
  createCareerNote,
  createCareerProfile,
  invalidateCareerFact,
  linkEvidence,
  rejectCareerFact,
  requestConfirmation,
  supersedeCareerFact,
  updateCareerFactPresentation,
  updateCareerNote,
  type CreateCareerEvidenceInput,
  type CreateCareerFactInput,
  type CreateCareerNoteInput,
  type DomainContext,
  type PresentationUpdate,
  type SupersedeInput,
} from '@/services/careerKnowledge/careerKnowledge';

// The subset of the Dexie database this repository needs. Accepting it as a
// parameter keeps the repository testable against an isolated instance.
type CareerDb = Pick<
  typeof defaultDb,
  | 'careerProfiles'
  | 'careerFacts'
  | 'careerEvidence'
  | 'factEvidenceLinks'
  | 'careerNotes'
  | 'transaction'
>;

export class CareerKnowledgeRepository {
  constructor(private readonly db: CareerDb = defaultDb) {}

  // --- Profile ---------------------------------------------------------------

  async createProfile(ctx?: DomainContext): Promise<CareerProfile> {
    const profile = createCareerProfile(ctx);
    await this.db.careerProfiles.add(profile);
    return profile;
  }

  getProfile(id: string): Promise<CareerProfile | undefined> {
    return this.db.careerProfiles.get(id);
  }

  /** Persist a domain-produced profile object (e.g. after a touch/update). */
  async saveProfile(profile: CareerProfile): Promise<CareerProfile> {
    await this.db.careerProfiles.put(profile);
    return profile;
  }

  /**
   * Delete a profile and every entity it owns (facts, evidence, links, notes).
   * Ownership is by `profileId`; links/notes are reached through the profile's
   * facts. Atomic so a profile is never left with dangling children.
   */
  async deleteProfile(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [
        this.db.careerProfiles,
        this.db.careerFacts,
        this.db.careerEvidence,
        this.db.factEvidenceLinks,
        this.db.careerNotes,
      ],
      async () => {
        const factIds = await this.db.careerFacts.where('profileId').equals(id).primaryKeys();
        for (const factId of factIds) {
          await this.db.factEvidenceLinks.where('factId').equals(factId).delete();
          await this.db.careerNotes.where('factId').equals(factId).delete();
        }
        await this.db.careerFacts.where('profileId').equals(id).delete();
        await this.db.careerEvidence.where('profileId').equals(id).delete();
        await this.db.careerProfiles.delete(id);
      }
    );
  }

  // --- Facts -----------------------------------------------------------------

  async createFact(input: CreateCareerFactInput, ctx?: DomainContext): Promise<CareerFact> {
    const fact = createCareerFact(input, ctx);
    await this.db.careerFacts.add(fact);
    return fact;
  }

  getFact(id: string): Promise<CareerFact | undefined> {
    return this.db.careerFacts.get(id);
  }

  listFacts(profileId: string): Promise<CareerFact[]> {
    return this.db.careerFacts.where('profileId').equals(profileId).toArray();
  }

  /** Presentation-neutral correction (typo/metadata); verification unchanged. */
  async updateFactPresentation(
    id: string,
    update: PresentationUpdate,
    ctx?: DomainContext
  ): Promise<CareerFact> {
    const fact = await this.requireFact(id);
    const next = updateCareerFactPresentation(fact, update, ctx);
    await this.db.careerFacts.put(next);
    return next;
  }

  async requestFactConfirmation(
    id: string,
    actor: Actor = 'system',
    ctx?: DomainContext
  ): Promise<CareerFact> {
    return this.persistTransition(id, (fact) => requestConfirmation(fact, actor, ctx));
  }

  /** USER-ONLY (domain enforces it). Only path to `confirmed`. */
  async confirmFact(id: string, actor: Actor, ctx?: DomainContext): Promise<CareerFact> {
    return this.persistTransition(id, (fact) => confirmCareerFact(fact, actor, ctx));
  }

  /** USER-ONLY. Only path to `rejected`. */
  async rejectFact(id: string, actor: Actor, ctx?: DomainContext): Promise<CareerFact> {
    return this.persistTransition(id, (fact) => rejectCareerFact(fact, actor, ctx));
  }

  /** USER-ONLY. Confirmed -> needs_confirmation for re-review. */
  async invalidateFact(id: string, actor: Actor, ctx?: DomainContext): Promise<CareerFact> {
    return this.persistTransition(id, (fact) => invalidateCareerFact(fact, actor, ctx));
  }

  /**
   * Materially change a claim: creates a NEW fact (unconfirmed) and marks the
   * old one `supersededBy`. History is preserved — the old fact is never
   * physically overwritten or deleted. Both writes are atomic.
   */
  async supersedeFact(
    id: string,
    input: SupersedeInput,
    ctx?: DomainContext
  ): Promise<{ previous: CareerFact; next: CareerFact }> {
    const oldFact = await this.requireFact(id);
    const { previous, next } = supersedeCareerFact(oldFact, input, ctx);
    await this.db.transaction('rw', this.db.careerFacts, async () => {
      await this.db.careerFacts.put(previous);
      await this.db.careerFacts.add(next);
    });
    return { previous, next };
  }

  /**
   * Delete a fact plus the records it owns: its fact/evidence links and its
   * notes. Evidence is retained — it is reusable provenance that may support
   * other facts.
   */
  async deleteFact(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.careerFacts, this.db.factEvidenceLinks, this.db.careerNotes],
      async () => {
        await this.db.factEvidenceLinks.where('factId').equals(id).delete();
        await this.db.careerNotes.where('factId').equals(id).delete();
        await this.db.careerFacts.delete(id);
      }
    );
  }

  // --- Evidence --------------------------------------------------------------

  async createEvidence(
    input: CreateCareerEvidenceInput,
    ctx?: DomainContext
  ): Promise<CareerEvidence> {
    const evidence = createCareerEvidence(input, ctx);
    await this.db.careerEvidence.add(evidence);
    return evidence;
  }

  getEvidence(id: string): Promise<CareerEvidence | undefined> {
    return this.db.careerEvidence.get(id);
  }

  listEvidence(profileId: string): Promise<CareerEvidence[]> {
    return this.db.careerEvidence.where('profileId').equals(profileId).toArray();
  }

  /** Delete evidence and any links referencing it. Facts are untouched. */
  async deleteEvidence(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.careerEvidence, this.db.factEvidenceLinks],
      async () => {
        await this.db.factEvidenceLinks.where('evidenceId').equals(id).delete();
        await this.db.careerEvidence.delete(id);
      }
    );
  }

  // --- Fact <-> Evidence links ----------------------------------------------

  /**
   * Associate evidence with a fact. Linking is pure provenance and never
   * changes the fact's verification state. Both entities must exist and belong
   * to the same profile.
   */
  async linkEvidenceToFact(
    factId: string,
    evidenceId: string,
    relation: FactEvidenceRelation
  ): Promise<FactEvidenceLink> {
    const link = linkEvidence(factId, evidenceId, relation);
    await this.db.transaction(
      'rw',
      [this.db.careerFacts, this.db.careerEvidence, this.db.factEvidenceLinks],
      async () => {
        const fact = await this.db.careerFacts.get(factId);
        if (!fact) throw new Error(`linkEvidenceToFact: fact "${factId}" not found`);
        const evidence = await this.db.careerEvidence.get(evidenceId);
        if (!evidence) throw new Error(`linkEvidenceToFact: evidence "${evidenceId}" not found`);
        if (fact.profileId !== evidence.profileId) {
          throw new Error('linkEvidenceToFact: fact and evidence belong to different profiles');
        }
        await this.db.factEvidenceLinks.put(link);
      }
    );
    return link;
  }

  async unlinkEvidenceFromFact(factId: string, evidenceId: string): Promise<void> {
    await this.db.factEvidenceLinks.delete([factId, evidenceId]);
  }

  async listLinksForFact(factId: string): Promise<FactEvidenceLink[]> {
    return this.db.factEvidenceLinks.where('factId').equals(factId).toArray();
  }

  /** Evidence linked to a fact, in link order. */
  async listEvidenceForFact(factId: string): Promise<CareerEvidence[]> {
    const links = await this.listLinksForFact(factId);
    const evidence = await this.db.careerEvidence.bulkGet(links.map((l) => l.evidenceId));
    return evidence.filter((e): e is CareerEvidence => !!e);
  }

  /** Facts a piece of evidence is linked to (one source may support many). */
  async listFactsForEvidence(evidenceId: string): Promise<CareerFact[]> {
    const links = await this.db.factEvidenceLinks.where('evidenceId').equals(evidenceId).toArray();
    const facts = await this.db.careerFacts.bulkGet(links.map((l) => l.factId));
    return facts.filter((f): f is CareerFact => !!f);
  }

  // --- Notes -----------------------------------------------------------------

  async createNote(input: CreateCareerNoteInput, ctx?: DomainContext): Promise<CareerNote> {
    const note = createCareerNote(input, ctx);
    await this.db.careerNotes.add(note);
    return note;
  }

  getNote(id: string): Promise<CareerNote | undefined> {
    return this.db.careerNotes.get(id);
  }

  listNotesForFact(factId: string): Promise<CareerNote[]> {
    return this.db.careerNotes.where('factId').equals(factId).toArray();
  }

  /**
   * Notes carry no `profileId` (they are owned by a fact); list by profile by
   * joining through that profile's facts.
   */
  async listNotesForProfile(profileId: string): Promise<CareerNote[]> {
    const factIds = await this.db.careerFacts.where('profileId').equals(profileId).primaryKeys();
    if (factIds.length === 0) return [];
    return this.db.careerNotes.where('factId').anyOf(factIds).toArray();
  }

  async updateNote(id: string, text: string, ctx?: DomainContext): Promise<CareerNote> {
    const note = await this.db.careerNotes.get(id);
    if (!note) throw new Error(`updateNote: note "${id}" not found`);
    const next = updateCareerNote(note, text, ctx);
    await this.db.careerNotes.put(next);
    return next;
  }

  async deleteNote(id: string): Promise<void> {
    await this.db.careerNotes.delete(id);
  }

  /** Execute a Dexie transaction against the career tables. */
  async transaction<T>(mode: 'r' | 'rw', fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction(
      mode,
      [this.db.careerFacts, this.db.careerEvidence, this.db.factEvidenceLinks],
      fn
    );
  }

  // --- internals -------------------------------------------------------------

  private async requireFact(id: string): Promise<CareerFact> {
    const fact = await this.db.careerFacts.get(id);
    if (!fact) throw new Error(`fact "${id}" not found`);
    return fact;
  }

  /**
   * Load a fact, apply a domain transition (which validates the move and the
   * actor), and persist the result atomically. The transition function is the
   * ONLY thing that can change verification state — there is no partial-write
   * path through this repository.
   */
  private async persistTransition(
    id: string,
    transition: (fact: CareerFact) => CareerFact
  ): Promise<CareerFact> {
    let next!: CareerFact;
    await this.db.transaction('rw', this.db.careerFacts, async (_tx: Transaction) => {
      const fact = await this.requireFact(id);
      next = transition(fact);
      await this.db.careerFacts.put(next);
    });
    return next;
  }
}

export const careerKnowledgeRepository = new CareerKnowledgeRepository();
