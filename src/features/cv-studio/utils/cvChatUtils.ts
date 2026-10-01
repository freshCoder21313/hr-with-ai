import { ResumeData } from '@/types/resume';
import {
  proposedChangeSchema,
  ProposedChangeAIResponse,
  interactiveQuestionSchema,
  InteractiveQuestion,
  interactiveQuestionGroupSchema,
  InteractiveQuestionGroup,
} from '@/services/ai/schemas';

export interface ProposedChange {
  id: string;
  section: keyof ResumeData;
  action: 'update' | 'add' | 'delete' | 'rewrite';
  newData: unknown;
  oldData?: unknown;
  explanation: string;
}

export interface ValidatedExtraction {
  changes: ProposedChange[];
  invalidCount: number;
  interactiveQuestionGroup?: InteractiveQuestionGroup | null;
  interactiveQuestion?: InteractiveQuestion | null;
  cleanedText: string;
}

const buildUniqueId = (preferred: string | undefined, existing: ProposedChange[]): string => {
  const base =
    preferred && preferred.trim() ? preferred : `change-${Date.now()}-${existing.length}`;
  if (!existing.some((change) => change.id === base)) return base;
  let suffix = 1;
  while (existing.some((change) => change.id === `${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
};

export const normalizeToQuestionGroup = (parsed: unknown): InteractiveQuestionGroup | null => {
  if (!parsed || typeof parsed !== 'object') return null;

  const record = parsed as Record<string, unknown>;

  // Case 1: envelope with `interactiveQuestionGroup`
  if ('interactiveQuestionGroup' in record) {
    const rawGroup = record.interactiveQuestionGroup;
    const result = interactiveQuestionGroupSchema.safeParse(rawGroup);
    if (result.success) return result.data;

    // Partial recovery for group if some fields are valid
    if (
      rawGroup &&
      typeof rawGroup === 'object' &&
      'questions' in (rawGroup as Record<string, unknown>)
    ) {
      const questionsRaw = (rawGroup as Record<string, unknown>).questions;
      if (Array.isArray(questionsRaw)) {
        const validQuestions = questionsRaw
          .map((q) => interactiveQuestionSchema.safeParse(q))
          .filter((res): res is { success: true; data: InteractiveQuestion } => res.success)
          .map((res) => res.data);

        if (validQuestions.length > 0) {
          const g = rawGroup as Record<string, unknown>;
          return {
            id: typeof g.id === 'string' && g.id.trim() ? g.id : `group_${Date.now()}`,
            title: typeof g.title === 'string' ? g.title : undefined,
            description: typeof g.description === 'string' ? g.description : undefined,
            questions: validQuestions,
            submitLabel: typeof g.submitLabel === 'string' ? g.submitLabel : undefined,
          };
        }
      }
    }
  }

  // Case 2: envelope with `interactiveQuestions` (array of questions)
  if ('interactiveQuestions' in record && Array.isArray(record.interactiveQuestions)) {
    const validQuestions = record.interactiveQuestions
      .map((q) => interactiveQuestionSchema.safeParse(q))
      .filter((res): res is { success: true; data: InteractiveQuestion } => res.success)
      .map((res) => res.data);

    if (validQuestions.length > 0) {
      return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id : `group_${Date.now()}`,
        title: typeof record.title === 'string' ? record.title : undefined,
        description: typeof record.description === 'string' ? record.description : undefined,
        questions: validQuestions,
        submitLabel: typeof record.submitLabel === 'string' ? record.submitLabel : undefined,
      };
    }
  }

  // Case 3: envelope with `interactiveQuestion` (single question)
  if ('interactiveQuestion' in record) {
    const qResult = interactiveQuestionSchema.safeParse(record.interactiveQuestion);
    if (qResult.success) {
      return {
        id: qResult.data.id || `group_${Date.now()}`,
        questions: [qResult.data],
        submitLabel: qResult.data.submitLabel,
      };
    }
  }

  // Case 4: root-level group object with `questions` array
  if ('questions' in record && Array.isArray(record.questions)) {
    const groupResult = interactiveQuestionGroupSchema.safeParse(record);
    if (groupResult.success) return groupResult.data;

    const validQuestions = record.questions
      .map((q) => interactiveQuestionSchema.safeParse(q))
      .filter((res): res is { success: true; data: InteractiveQuestion } => res.success)
      .map((res) => res.data);

    if (validQuestions.length > 0) {
      return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id : `group_${Date.now()}`,
        title: typeof record.title === 'string' ? record.title : undefined,
        description: typeof record.description === 'string' ? record.description : undefined,
        questions: validQuestions,
        submitLabel: typeof record.submitLabel === 'string' ? record.submitLabel : undefined,
      };
    }
  }

  // Case 5: root-level single question object
  if ('question' in record && 'type' in record) {
    const qResult = interactiveQuestionSchema.safeParse(record);
    if (qResult.success) {
      return {
        id: qResult.data.id || `group_${Date.now()}`,
        questions: [qResult.data],
        submitLabel: qResult.data.submitLabel,
      };
    }
  }

  return null;
};

export const tryParseOrRepairJson = (content: string): unknown => {
  const trimmed = content.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Attempt repairs
  }

  // Attempt 1: Stack-based container tracking (LIFO)
  try {
    let fixed = trimmed;

    let inString = false;
    let escaped = false;
    const stack: string[] = [];

    for (let i = 0; i < fixed.length; i++) {
      const ch = fixed[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === '{') {
          stack.push('}');
        } else if (ch === '[') {
          stack.push(']');
        } else if (ch === '}' || ch === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === ch) {
            stack.pop();
          }
        }
      }
    }

    if (inString) {
      fixed += '"';
    }

    fixed = fixed.replace(/,\s*$/, '');
    if (/:\s*$/.test(fixed)) {
      fixed += '""';
    }

    while (stack.length > 0) {
      fixed += stack.pop();
    }

    return JSON.parse(fixed);
  } catch {
    // Attempt 2: Fallback simple count-based repair
    try {
      let simpleFixed = trimmed.replace(/,\s*$/, '');
      const oBraces = (simpleFixed.match(/{/g) || []).length;
      const cBraces = (simpleFixed.match(/}/g) || []).length;
      const oBrackets = (simpleFixed.match(/\[/g) || []).length;
      const cBrackets = (simpleFixed.match(/]/g) || []).length;

      simpleFixed += ']'.repeat(Math.max(0, oBrackets - cBrackets));
      simpleFixed += '}'.repeat(Math.max(0, oBraces - cBraces));
      return JSON.parse(simpleFixed);
    } catch {
      return null;
    }
  }
};

const isRecognizedPayload = (parsed: unknown): boolean => {
  if (!parsed || typeof parsed !== 'object') return false;
  const rec = parsed as Record<string, unknown>;
  if ('proposedChanges' in rec && Array.isArray(rec.proposedChanges)) return true;
  if ('interactiveQuestion' in rec) return true;
  if ('interactiveQuestions' in rec) return true;
  if ('interactiveQuestionGroup' in rec) return true;
  if ('question' in rec && 'type' in rec) return true;
  if ('questions' in rec && Array.isArray(rec.questions)) return true;
  return false;
};

interface TextRange {
  start: number;
  end: number;
}

export const extractValidatedProposedChanges = (text: string): ValidatedExtraction => {
  const allChanges: ProposedChange[] = [];
  let invalidCount = 0;
  let extractedGroup: InteractiveQuestionGroup | null = null;
  const rangesToRemove: TextRange[] = [];
  const parsedObjects: unknown[] = [];

  // Step 1: Scan for fenced code blocks
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)(?:```|$)/gi;
  let match: RegExpExecArray | null;
  const fencedRanges: TextRange[] = [];

  while ((match = jsonBlockRegex.exec(text)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    const content = match[1].trim();
    fencedRanges.push({ start, end });
    rangesToRemove.push({ start, end });

    if (!content) continue;

    const parsed = tryParseOrRepairJson(content);
    if (parsed && typeof parsed === 'object') {
      parsedObjects.push(parsed);
    }
  }

  // Step 2: Scan for unfenced/raw JSON blocks outside of fenced code blocks
  let i = 0;
  while (i < text.length) {
    // If inside any fenced range, skip to the end of the fenced range
    const fenced = fencedRanges.find((r) => i >= r.start && i < r.end);
    if (fenced) {
      i = fenced.end;
      continue;
    }

    if (text[i] === '{') {
      let depth = 0;
      let inString = false;
      let escaped = false;
      let endIndex = -1;

      for (let j = i; j < text.length; j++) {
        // If we bump into a fenced range, stop scanning this block
        if (fencedRanges.some((r) => j >= r.start && j < r.end)) {
          break;
        }

        const ch = text[j];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\' && inString) {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (ch === '{') {
            depth++;
          } else if (ch === '}') {
            depth--;
            if (depth === 0) {
              endIndex = j + 1;
              break;
            }
          }
        }
      }

      if (endIndex !== -1) {
        const candidate = text.slice(i, endIndex);
        const parsed = tryParseOrRepairJson(candidate);
        if (parsed && isRecognizedPayload(parsed)) {
          parsedObjects.push(parsed);
          rangesToRemove.push({ start: i, end: endIndex });
          i = endIndex;
          continue;
        }
      } else if (depth > 0) {
        // Incomplete / streaming JSON at the end of text
        const candidate = text.slice(i);
        if (
          /(?:proposedChanges|interactiveQuestion|interactiveQuestions|interactiveQuestionGroup|"question"\s*:|"questions"\s*:)/i.test(
            candidate
          )
        ) {
          const parsed = tryParseOrRepairJson(candidate);
          if (parsed && isRecognizedPayload(parsed)) {
            parsedObjects.push(parsed);
            rangesToRemove.push({ start: i, end: text.length });
            break;
          }
        }
      }
    }
    i++;
  }

  // Step 3: Process all collected parsed objects
  for (const parsed of parsedObjects) {
    if (!parsed || typeof parsed !== 'object') continue;

    if ('proposedChanges' in parsed) {
      const envelope = parsed as { proposedChanges: unknown[] };
      if (Array.isArray(envelope.proposedChanges)) {
        envelope.proposedChanges.forEach((change: unknown) => {
          const result = proposedChangeSchema.safeParse(change);
          if (result.success) {
            const validated = result.data as ProposedChangeAIResponse;
            allChanges.push({
              id: buildUniqueId(validated.id, allChanges),
              section: validated.section as keyof ResumeData,
              action: validated.action as 'update' | 'add' | 'delete' | 'rewrite',
              newData: validated.newData,
              explanation: validated.explanation,
            });
          } else {
            invalidCount++;
          }
        });
      }
    }

    if (!extractedGroup) {
      extractedGroup = normalizeToQuestionGroup(parsed);
    }
  }

  // Step 4: Clean text by removing all identified ranges
  const sortedRanges = [...rangesToRemove].sort((a, b) => a.start - b.start);
  const mergedRanges: TextRange[] = [];
  for (const r of sortedRanges) {
    if (mergedRanges.length === 0) {
      mergedRanges.push({ ...r });
    } else {
      const last = mergedRanges[mergedRanges.length - 1];
      if (r.start <= last.end) {
        last.end = Math.max(last.end, r.end);
      } else {
        mergedRanges.push({ ...r });
      }
    }
  }

  let cleanedText = '';
  let cursor = 0;
  for (const range of mergedRanges) {
    if (range.start > cursor) {
      cleanedText += text.slice(cursor, range.start);
    }
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < text.length) {
    cleanedText += text.slice(cursor);
  }

  cleanedText = cleanedText
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  return {
    changes: allChanges,
    invalidCount,
    interactiveQuestionGroup: extractedGroup,
    interactiveQuestion: extractedGroup?.questions[0] ?? null,
    cleanedText,
  };
};

export const cleanChatResponse = (
  fullResponse: string,
  extraction?: ValidatedExtraction
): string => {
  if (extraction?.cleanedText !== undefined) {
    return extraction.cleanedText;
  }
  const result = extractValidatedProposedChanges(fullResponse);
  return result.cleanedText;
};

export const extractChatPayload = extractValidatedProposedChanges;

export const extractProposedChanges = (text: string): ProposedChange[] | null => {
  const { changes } = extractValidatedProposedChanges(text);
  return changes.length > 0 ? changes : null;
};

export const extractInteractiveQuestionGroup = (text: string): InteractiveQuestionGroup | null => {
  const { interactiveQuestionGroup } = extractValidatedProposedChanges(text);
  return interactiveQuestionGroup ?? null;
};

export const extractInteractiveQuestion = (text: string): InteractiveQuestion | null => {
  const { interactiveQuestion } = extractValidatedProposedChanges(text);
  return interactiveQuestion ?? null;
};
