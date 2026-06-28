import type { ResumeData } from '@/types/resume';

export type WithEntryId<T> = T & { _entryId: string };

export function createEntry<T>(defaultEntry: T): WithEntryId<T> {
  return { ...defaultEntry, _entryId: crypto.randomUUID() };
}

export function getEntryKey(entry: { _entryId?: string }, index: number): string {
  return entry._entryId ?? `entry-fallback-${index}`;
}

export function ensureEntryIds<T>(data: (T & { _entryId?: string })[]): WithEntryId<T>[] {
  let changed = false;
  const next = data.map((entry, index) => {
    if (entry._entryId) return entry as WithEntryId<T>;
    changed = true;
    return { ...entry, _entryId: `legacy-${index}-${crypto.randomUUID()}` };
  });
  return changed ? next : (data as WithEntryId<T>[]);
}

export function stripEntryId<T extends { _entryId?: string }>(entry: T): Omit<T, '_entryId'> {
  const rest = { ...entry };
  delete rest._entryId;
  return rest;
}

export function stripEntryIds<T extends { _entryId?: string }>(entries?: T[]): Omit<T, '_entryId'>[] | undefined {
  return entries?.map(stripEntryId);
}

export function sanitizeResumeDataForSave(data: ResumeData): ResumeData {
  return {
    ...data,
    work: stripEntryIds(data.work as Array<{ _entryId?: string }>) as ResumeData['work'],
    education: stripEntryIds(data.education as Array<{ _entryId?: string }>) as ResumeData['education'],
    skills: stripEntryIds(data.skills as Array<{ _entryId?: string }>) as ResumeData['skills'],
    projects: stripEntryIds(data.projects as Array<{ _entryId?: string }>) as ResumeData['projects'],
  };
}