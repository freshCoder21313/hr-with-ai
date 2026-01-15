import Dexie, { Table } from 'dexie';
import { Interview } from '../types';

class HRDatabase extends Dexie {
  interviews!: Table<Interview, number>;

  constructor() {
    super('VietPhongDB');
    // Cast 'this' to any to avoid TypeScript error "Property 'version' does not exist on type 'HRDatabase'"
    (this as any).version(1).stores({
      interviews: '++id, createdAt, company, jobTitle, status'
    });
  }
}

export const db = new HRDatabase();