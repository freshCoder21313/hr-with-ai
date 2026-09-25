import { ResumeData } from '@/types/resume';
import { proposedChangeSchema, ProposedChangeAIResponse } from '@/services/ai/schemas';

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
}

export const extractValidatedProposedChanges = (text: string): ValidatedExtraction => {
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)(?:```|$)/gi;
  let match;
  const allChanges: ProposedChange[] = [];
  let invalidCount = 0;

  while ((match = jsonBlockRegex.exec(text)) !== null) {
    const content = match[1].trim();
    if (!content) continue;

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      // If parsing failed, try existing repair logic
      try {
        let fixedContent = content.replace(/,\s*$/, '');
        const openBraces = (fixedContent.match(/{/g) || []).length;
        const closeBraces = (fixedContent.match(/}/g) || []).length;
        const openBrackets = (fixedContent.match(/\[/g) || []).length;
        const closeBrackets = (fixedContent.match(/]/g) || []).length;

        fixedContent += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
        fixedContent += '}'.repeat(Math.max(0, openBraces - closeBraces));

        parsed = JSON.parse(fixedContent);
      } catch {
        continue;
      }
    }

    if (parsed && typeof parsed === 'object' && 'proposedChanges' in parsed) {
      const envelope = parsed as { proposedChanges: unknown[] };
      if (Array.isArray(envelope.proposedChanges)) {
        envelope.proposedChanges.forEach((change: unknown) => {
          const result = proposedChangeSchema.safeParse(change);
          if (result.success) {
            // Assign stable IDs only after validation passes
            const validated = result.data as ProposedChangeAIResponse;
            allChanges.push({
              id: validated.id ?? `change-${Date.now()}-${allChanges.length}`,
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
  }

  return { changes: allChanges, invalidCount };
};

export const extractProposedChanges = (text: string): ProposedChange[] | null => {
  const { changes } = extractValidatedProposedChanges(text);
  return changes.length > 0 ? changes : null;
};
