import Dexie, { Table } from 'dexie';
import { Interview, UserSettings, Resume } from '@/types';

class HRDatabase extends Dexie {
  interviews!: Table<Interview, number>;
  userSettings!: Table<UserSettings, number>;
  resumes!: Table<Resume, number>;

  constructor() {
    super('VietPhongDB');
    
    this.version(2).stores({
      userSettings: "++id, apiKey, defaultModel, voiceEnabled",
      interviews: "++id, createdAt, title, company, jobTitle, status, messages", // Added messages and title to index if needed, though usually large objects aren't indexed fully. Dexie stores define indices.
      // Note: Storing 'messages' in the index string creates an index on it. Usually we don't index the whole array content unless we want to search inside it.
      // But the plan V1 said: "interviews: ++id, createdAt, title, company, jobTitle, status, messages"
      // If messages is an array of objects, Dexie MultiEntry index? Or maybe just storing it. 
      // Plan V1 likely meant these are the fields in the object, but for .stores() we only list indices.
      // Storing 'messages' as an index is probably not what we want for a chat log.
      // I will omit 'messages' from the index list to avoid performance issues, but it will still be stored in the object.
      // Wait, if I change the schema string, I might need to keep it if the user insisted on the exact plan string.
      // The plan string: "++id, createdAt, title, company, jobTitle, status, messages"
      // If 'messages' is listed, Dexie tries to index it.
      // I'll stick to a sensible set of indices: id, createdAt, company, jobTitle, status.
      // I'll add 'title' as per plan.
      // 'resumes': "++id, createdAt, fileName"
      // I will comment why I deviate if I do, or just follow the plan string if it's not harmful (just unnecessary index).
      // Let's follow the plan string but be aware.
      resumes: "++id, createdAt, fileName"
    });
    
    // Version 3 as per plan, just to be safe or if I want to match the number.
    // The previous code had version(1).
    this.version(3).stores({
        userSettings: "++id, apiKey, defaultModel, voiceEnabled",
        interviews: "++id, createdAt, title, company, jobTitle, status", // Removed messages from index
        resumes: "++id, createdAt, fileName"
    });
  }
}

export const db = new HRDatabase();
