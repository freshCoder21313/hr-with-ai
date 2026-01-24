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
      userSettings: '++id, apiKey, defaultModel, voiceEnabled, hintsEnabled, autoFinishEnabled, updatedAt',
      interviews: '++id, createdAt, title, company, jobTitle, status, updatedAt',
      resumes: '++id, createdAt, fileName, formatted, updatedAt',
    });

    // Add hooks to auto-update updatedAt
    this.interviews.hook('creating', (primKey, obj) => {
      obj.updatedAt = Date.now();
      if (!obj.createdAt) obj.createdAt = Date.now();
    });
    this.interviews.hook('updating', (mods, primKey, obj, trans) => {
      return { updatedAt: Date.now() };
    });

    this.resumes.hook('creating', (primKey, obj) => {
      obj.updatedAt = Date.now();
      if (!obj.createdAt) obj.createdAt = Date.now();
    });
    this.resumes.hook('updating', (mods, primKey, obj, trans) => {
      return { updatedAt: Date.now() };
    });

    this.userSettings.hook('creating', (primKey, obj) => {
      obj.updatedAt = Date.now();
    });
    this.userSettings.hook('updating', (mods, primKey, obj, trans) => {
      return { updatedAt: Date.now() };
    });
  }
}

export const db = new HRDatabase();
