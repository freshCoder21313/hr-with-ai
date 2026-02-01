import { ResumeData } from '@/types/resume';

export interface ProposedChange {
  section: keyof ResumeData;
  newData: any;
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
        return parsed.proposedChanges;
      }
    } catch (e) {
      console.warn('Failed to parse JSON block from AI response', e);
    }
  }
  return null;
};
