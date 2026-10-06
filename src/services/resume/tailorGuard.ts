import type { Education, Project, ResumeData, Skill, Work } from '../../types/resume';

export type TailorIssueKind = 'work' | 'education' | 'project' | 'skill';

export interface TailorIssue {
  kind: TailorIssueKind;
  detail: string;
  entry?: unknown;
}

const norm = (value: string | undefined | null): string => (value ?? '').trim().toLowerCase();

const workKey = (w: Work): string => `${norm(w.name)}::${norm(w.position)}`;
const educationKey = (e: Education): string =>
  `${norm(e.institution)}::${norm(e.area || e.studyType)}`;
const projectKey = (p: Project): string => norm(p.name);
const skillKey = (s: Skill): string => norm(s.name);

/**
 * Collect entries present in `tailored` that have no counterpart in `source`.
 * A `source` field that is empty/undefined means the user had no data there,
 * so any entry the tailor produced is a legitimate addition, not a fabrication.
 */
function diffEntries<T>(
  kind: TailorIssueKind,
  sourceList: T[] | undefined | null,
  tailoredList: T[] | undefined | null,
  key: (entry: T) => string,
  detail: (entry: T) => string
): TailorIssue[] {
  if (!sourceList || sourceList.length === 0) return [];
  if (!tailoredList) return [];

  const known = new Set(sourceList.map(key));
  const issues: TailorIssue[] = [];
  for (const entry of tailoredList) {
    if (!known.has(key(entry))) {
      issues.push({ kind, detail: detail(entry), entry });
    }
  }
  return issues;
}

/** Fabricated entities introduced by a tailoring pass, relative to the original resume. */
export function diffTailorOutput(source: ResumeData, tailored: ResumeData): TailorIssue[] {
  return [
    ...diffEntries<Work>(
      'work',
      source.work,
      tailored.work,
      workKey,
      (w) => `${w.name} — ${w.position}`
    ),
    ...diffEntries<Education>(
      'education',
      source.education,
      tailored.education,
      educationKey,
      (e) => `${e.institution} — ${e.area || e.studyType}`
    ),
    ...diffEntries<Project>(
      'project',
      source.projects,
      tailored.projects,
      projectKey,
      (p) => p.name
    ),
    ...diffEntries<Skill>('skill', source.skills, tailored.skills, skillKey, (s) => s.name),
  ];
}

function partition<T>(
  sourceList: T[] | undefined | null,
  tailoredList: T[] | undefined | null,
  key: (e: T) => string
): T[] {
  if (!tailoredList) return [];
  if (!sourceList || sourceList.length === 0) return [...tailoredList];
  const known = new Set(sourceList.map(key));
  return tailoredList.filter((e) => known.has(key(e)));
}

/**
 * `tailored` with every fabricated entity removed. All other fields are passed
 * through untouched; legitimate entries are always kept.
 */
export function filterFaithfulResume(source: ResumeData, tailored: ResumeData): ResumeData {
  return {
    ...tailored,
    work: partition(source.work, tailored.work, workKey),
    education: partition(source.education, tailored.education, educationKey),
    projects: partition(source.projects, tailored.projects, projectKey),
    skills: partition(source.skills, tailored.skills, skillKey),
  };
}

export function assertTailorFaithful(
  source: ResumeData,
  tailored: ResumeData
): { valid: boolean; issues: TailorIssue[] } {
  const issues = diffTailorOutput(source, tailored);
  return { valid: issues.length === 0, issues };
}
