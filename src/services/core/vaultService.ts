import { syncService, SyncData } from './syncService';
import { logger } from '@/lib/logger';

export interface HRVaultMetadata {
  vaultVersion: number;
  appName: string;
  exportedAt: string;
  counts: {
    interviews: number;
    resumes: number;
    userSettings: number;
    jobs: number;
    jobRecommendations: number;
    careerProfiles: number;
    careerFacts: number;
    careerEvidence: number;
    careerNotes: number;
  };
}

export interface HRVaultPackage {
  format: 'hr-with-ai-vault';
  metadata: HRVaultMetadata;
  payload: SyncData;
}

export const vaultService = {
  /**
   * Builds a complete vault bundle of all 10 local database tables.
   */
  createVaultPackage: async (
    options: { includeSensitive?: boolean } = {}
  ): Promise<HRVaultPackage> => {
    const fullData = await syncService.exportData({
      includeSensitive: !!options.includeSensitive,
      excludeCareerKnowledge: false,
    });

    const metadata: HRVaultMetadata = {
      vaultVersion: 1,
      appName: 'hr-with-ai',
      exportedAt: new Date().toISOString(),
      counts: {
        interviews: fullData.interviews?.length || 0,
        resumes: fullData.resumes?.length || 0,
        userSettings: fullData.userSettings?.length || 0,
        jobs: fullData.jobs?.length || 0,
        jobRecommendations: fullData.jobRecommendations?.length || 0,
        careerProfiles: fullData.careerProfiles?.length || 0,
        careerFacts: fullData.careerFacts?.length || 0,
        careerEvidence: fullData.careerEvidence?.length || 0,
        careerNotes: fullData.careerNotes?.length || 0,
      },
    };

    return {
      format: 'hr-with-ai-vault',
      metadata,
      payload: fullData,
    };
  },

  /**
   * Triggers a browser download of the .hrvault file.
   */
  downloadVaultFile: async (options: { includeSensitive?: boolean } = {}): Promise<string> => {
    const vault = await vaultService.createVaultPackage(options);
    const jsonStr = JSON.stringify(vault, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `hr-career-vault-${dateStr}.hrvault`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return fileName;
  },

  /**
   * Validates and imports an .hrvault file content into the local database.
   */
  importVault: async (
    fileContent: string
  ): Promise<{ success: boolean; metadata?: HRVaultMetadata; error?: string }> => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      return {
        success: false,
        error: 'This file is not valid JSON. Export a fresh backup and try again.',
      };
    }

    // Verify format
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid vault file: Not a valid JSON object.' };
    }

    const obj = parsed as Record<string, unknown>;
    let payloadToImport: SyncData;
    let metadata: HRVaultMetadata | undefined;

    if (obj.format === 'hr-with-ai-vault' && obj.payload) {
      payloadToImport = obj.payload as SyncData;
      metadata = obj.metadata as HRVaultMetadata | undefined;
    } else {
      // Fallback for raw SyncData / legacy backup format
      payloadToImport = obj as unknown as SyncData;
    }

    try {
      await syncService.importData(payloadToImport);
      return { success: true, metadata };
    } catch (err) {
      logger.error('Failed to import and merge vault:', err);
      return {
        success: false,
        error:
          err instanceof Error
            ? `The file parsed, but applying it failed: ${err.message}`
            : 'The file parsed, but applying it to this device failed.',
      };
    }
  },
};
