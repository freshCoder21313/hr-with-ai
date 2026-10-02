import type { ResumeData } from '@/types/resume';

/**
 * Guarantees a renderable `ResumeData` shape. Tailored, imported, or legacy
 * rows can arrive without `basics` or section arrays, and every resume
 * template/form dereferences them directly (`basics.summary`, `work.map`),
 * so this is the single boundary that heals them. Applied both at the Dexie
 * read hook (persisted rows) and at the render boundary (any in-memory data).
 */
export const withResumeDefaults = (data: ResumeData): ResumeData => ({
  ...data,
  basics: data.basics ?? { name: '', email: '', label: '', summary: '' },
  work: data.work ?? [],
  education: data.education ?? [],
  skills: data.skills ?? [],
  projects: data.projects ?? [],
});
