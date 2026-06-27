import { ResumeData } from '@/types/resume';

export interface ProposedChange {
  id: string;
  section: keyof ResumeData;
  action: 'update' | 'add' | 'delete' | 'rewrite';
  newData: unknown;
  explanation: string;
}

export const extractProposedChanges = (text: string): ProposedChange[] | null => {
  // Regex to match JSON blocks with or without the 'json' tag, handling various spacing
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(jsonBlockRegex);

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.proposedChanges && Array.isArray(parsed.proposedChanges)) {
        return parsed.proposedChanges.map(
          (change: Omit<ProposedChange, 'id'> & { id?: string }, index: number) => ({
            ...change,
            id: change.id ?? `change-${Date.now()}-${index}`,
          })
        );
      }
    } catch (e) {
      console.warn('Failed to parse JSON block from AI response', e);
    }
  }
  return null;
};
