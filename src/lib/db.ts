import Dexie, { Table } from 'dexie';
import { Interview, UserSettings, Resume } from '@/types';
import { DBJobRecommendation } from '@/services/jobRecommendationService';

class HRDatabase extends Dexie {
  interviews!: Table<Interview, number>;
  userSettings!: Table<UserSettings, number>;
  resumes!: Table<Resume, number>;
  job_recommendations!: Table<DBJobRecommendation, number>;

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

    // Add hooks to auto-update updatedAt
    this.interviews.hook('creating', (_primKey, obj) => {
      obj.updatedAt = Date.now();
      if (!obj.createdAt) obj.createdAt = Date.now();
    });
    this.interviews.hook('updating', (_mods, _primKey, _obj, _trans) => {
      return { updatedAt: Date.now() };
    });

    this.resumes.hook('creating', (_primKey, obj) => {
      obj.updatedAt = Date.now();
      if (!obj.createdAt) obj.createdAt = Date.now();
    });
    this.resumes.hook('updating', (_mods, _primKey, _obj, _trans) => {
      return { updatedAt: Date.now() };
    });

    this.userSettings.hook('creating', (_primKey, obj) => {
      obj.updatedAt = Date.now();
    });
    this.userSettings.hook('updating', (_mods, _primKey, _obj, _trans) => {
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
}

export const db = new HRDatabase();
