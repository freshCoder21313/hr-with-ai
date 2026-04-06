import Dexie, { Table } from 'dexie';
import { Interview, UserSettings, Resume, SavedJob } from '@/types';
import { DBJobRecommendation } from '@/services/jobs/jobRecommendationService';
import LZString from 'lz-string';

class HRDatabase extends Dexie {
  interviews!: Table<Interview, number>;
  userSettings!: Table<UserSettings, number>;
  resumes!: Table<Resume, number>;
  job_recommendations!: Table<DBJobRecommendation, number>;
  jobs!: Table<SavedJob, number>;

  constructor() {
    super('VietPhongDB');

    this.version(2).stores({
      userSettings: '++id, apiKey, defaultModel, voiceEnabled',
      interviews: '++id, createdAt, title, company, jobTitle, status, messages',
      resumes: '++id, createdAt, fileName',
    });

    this.version(6).stores({
      userSettings: '++id, apiKey, defaultModel, voiceEnabled, hintsEnabled, autoFinishEnabled',
      interviews: '++id, createdAt, title, company, jobTitle, status',
      resumes: '++id, createdAt, fileName, formatted',
      job_recommendations: '++id, interviewId, resumeId, title, company, matchScore, createdAt',
    });

    this.version(7).stores({
      resumes: '++id, createdAt, fileName, formatted',
    });

    // Version 8: Add updatedAt for sync merging
    this.version(8).stores({
      userSettings:
        '++id, apiKey, defaultModel, voiceEnabled, hintsEnabled, autoFinishEnabled, updatedAt',
      interviews: '++id, createdAt, title, company, jobTitle, status, updatedAt',
      resumes: '++id, createdAt, fileName, formatted, updatedAt',
    });

    // Version 9: Add isMain index to resumes
    this.version(9).stores({
      resumes: '++id, createdAt, fileName, formatted, updatedAt, isMain',
    });

    // Version 10: Add GitHub settings
    this.version(10).stores({
      userSettings:
        '++id, apiKey, githubUsername, githubToken, defaultModel, voiceEnabled, hintsEnabled, autoFinishEnabled, updatedAt',
    });

    // Version 11: Add AI Provider
    this.version(11).stores({
      userSettings:
        '++id, apiKey, githubUsername, githubToken, defaultModel, voiceEnabled, hintsEnabled, autoFinishEnabled, updatedAt, provider',
    });

    // Version 12: Add Saved Jobs
    this.version(12).stores({
      jobs: '++id, company, jobTitle, createdAt, updatedAt',
    });

    // Version 13: Compression for resumes
    this.version(13).stores({
      resumes: '++id, createdAt, fileName, formatted, updatedAt, isMain',
    });

    // Add hooks to auto-update updatedAt
    this.interviews.hook('creating', (_primKey, obj) => {
      obj.updatedAt = Date.now();
      if (!obj.createdAt) obj.createdAt = Date.now();
    });
    this.interviews.hook('updating', (_mods, _primKey, _obj, _trans) => {
      return { updatedAt: Date.now() };
    });

    this.resumes.hook('reading', (obj) => {
      if (obj && obj.compressedData && !obj.parsedData) {
        try {
          const decompressed = LZString.decompressFromUTF16(obj.compressedData);
          if (decompressed) {
            obj.parsedData = JSON.parse(decompressed);
          }
        } catch (e) {
          console.error('Failed to decompress parsedData for resume:', obj.id, e);
        }
      }
      return obj;
    });

    this.resumes.hook('creating', (_primKey, obj) => {
      obj.updatedAt = Date.now();
      if (!obj.createdAt) obj.createdAt = Date.now();

      if (obj.parsedData) {
        try {
          obj.compressedData = LZString.compressToUTF16(JSON.stringify(obj.parsedData));
          delete obj.parsedData;
        } catch (e) {
          console.error('Failed to compress parsedData on create:', e);
        }
      }
    });
    this.resumes.hook('updating', (mods: Partial<Resume>, _primKey, _obj, _trans) => {
      const extraMods: Partial<Resume> = { updatedAt: Date.now() };

      if ('parsedData' in mods) {
        const pd = mods.parsedData;
        if (pd) {
          try {
            extraMods.compressedData = LZString.compressToUTF16(JSON.stringify(pd));
          } catch (e) {
            console.error('Failed to compress parsedData on update:', e);
          }
        } else if (pd === null) {
          extraMods.compressedData = undefined;
        }
        // Deletes parsedData from DB storage (using any since undefined deletes it in Dexie)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (extraMods as any).parsedData = undefined;
      }
      return extraMods;
    });

    this.userSettings.hook('creating', (_primKey, obj) => {
      obj.updatedAt = Date.now();
    });
    this.userSettings.hook('updating', (_mods, _primKey, _obj, _trans) => {
      return { updatedAt: Date.now() };
    });

    this.jobs.hook('creating', (_primKey, obj) => {
      obj.updatedAt = Date.now();
      if (!obj.createdAt) obj.createdAt = Date.now();
    });
    this.jobs.hook('updating', (_mods, _primKey, _obj, _trans) => {
      return { updatedAt: Date.now() };
    });
  }

  /**
   * Sets a specific resume as the Main CV.
   * Uses a transaction to ensure all other resumes are unset first.
   */
  async setMainCV(id: number) {
    return this.transaction('rw', this.resumes, async () => {
      // 1. Unset 'isMain' for ALL resumes that currently have it
      await this.resumes.filter((resume) => !!resume.isMain).modify({ isMain: false });

      // 2. Set 'isMain' for the target resume
      await this.resumes.update(id, { isMain: true });
    });
  }

  /**
   * Retrieves the current Main CV.
   */
  async getMainCV() {
    return this.resumes.filter((r) => !!r.isMain).first();
  }

  /**
   * Cleans up old draft resumes that have not been updated in over 30 days
   * and are not marked as the Main CV.
   */
  async cleanOldResumes() {
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    try {
      const oldResumes = await this.resumes
        .filter((r) => {
          if (r.isMain) return false;
          // Use updatedAt if available, fallback to createdAt
          const lastModified = r.updatedAt || r.createdAt || 0;
          return now - lastModified > THIRTY_DAYS;
        })
        .toArray();

      if (oldResumes.length > 0) {
        const ids = oldResumes.map((r) => r.id!);
        await this.resumes.bulkDelete(ids);
      }
    } catch (e) {
      console.error('Failed to clean old resumes:', e);
    }
  }
}

export const db = new HRDatabase();
