import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { vaultService } from './vaultService';

describe('vaultService (.hrvault file export & import)', () => {
  beforeEach(async () => {
    await db.interviews.clear();
    await db.resumes.clear();
    await db.userSettings.clear();
    await db.careerProfiles.clear();
    await db.careerFacts.clear();
    await db.careerEvidence.clear();
    await db.factEvidenceLinks.clear();
    await db.careerNotes.clear();
  });

  it('packages full database state into HRVaultPackage format', async () => {
    // Populate some facts and settings
    await db.careerProfiles.add({
      id: 'prof-vault-test-1',
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.careerFacts.add({
      id: 'fact-vault-1',
      profileId: 'prof-vault-test-1',
      category: 'experience',
      subject: 'Senior Engineer',
      claim: 'Led architectural refactor for cloud sync',
      verificationState: 'confirmed',
      origin: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const vault = await vaultService.createVaultPackage({ includeSensitive: true });

    expect(vault.format).toBe('hr-with-ai-vault');
    expect(vault.metadata.vaultVersion).toBe(1);
    expect(vault.metadata.counts.careerProfiles).toBe(1);
    expect(vault.metadata.counts.careerFacts).toBe(1);
    expect(vault.payload.careerFacts?.[0].claim).toBe('Led architectural refactor for cloud sync');
  });

  it('imports .hrvault JSON file content and merges cleanly into local database', async () => {
    const rawVaultPackage = {
      format: 'hr-with-ai-vault',
      metadata: {
        vaultVersion: 1,
        appName: 'hr-with-ai',
        exportedAt: new Date().toISOString(),
        counts: {
          interviews: 0,
          resumes: 0,
          userSettings: 0,
          jobs: 0,
          jobRecommendations: 0,
          careerProfiles: 1,
          careerFacts: 1,
          careerEvidence: 0,
          careerNotes: 0,
        },
      },
      payload: {
        formatVersion: 2,
        interviews: [],
        userSettings: [],
        resumes: [],
        careerProfiles: [
          {
            id: 'prof-imported-from-vault',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        careerFacts: [
          {
            id: 'fact-imported-from-vault',
            profileId: 'prof-imported-from-vault',
            category: 'skill',
            subject: 'TypeScript',
            claim: 'Expert in TypeScript and React architecture',
            verificationState: 'confirmed',
            origin: 'user',
            supersededBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    };

    const res = await vaultService.importVault(JSON.stringify(rawVaultPackage));
    expect(res.success).toBe(true);

    const factInDb = await db.careerFacts.get('fact-imported-from-vault');
    expect(factInDb).toBeDefined();
    expect(factInDb?.subject).toBe('TypeScript');
    expect(factInDb?.claim).toBe('Expert in TypeScript and React architecture');
  });

  it('gracefully rejects invalid vault content', async () => {
    const res = await vaultService.importVault('invalid json non-object');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
