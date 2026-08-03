import { ResumeData } from '@/types/resume';

export interface ProposedChange {
  id: string;
  section: keyof ResumeData;
  action: 'update' | 'add' | 'delete' | 'rewrite';
  newData: unknown;
  explanation: string;
}

export const extractProposedChanges = (text: string): ProposedChange[] | null => {
  // Regex to match JSON blocks, including unclosed ones at the end of text
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)(?:```|$)/gi;
  let match;

  while ((match = jsonBlockRegex.exec(text)) !== null) {
    let content = match[1].trim();
    if (!content) continue;

    // If it looks like it might be truncated JSON, try to fix it
    if (!content.endsWith('}') && !content.endsWith(']')) {
      // Very basic attempt to close JSON if it looks like it's in a proposedChanges structure
      if (content.includes('"proposedChanges"')) {
        // We could try more complex recovery, but for now let's see if we can at least parse partials
        // or just accept it as is and hope JSON.parse handles some trailing issues (it won't)
      }
    }

    try {
      const parsed = JSON.parse(content);
      if (parsed.proposedChanges && Array.isArray(parsed.proposedChanges)) {
        return parsed.proposedChanges.map(
          (change: Omit<ProposedChange, 'id'> & { id?: string }, index: number) => ({
            ...change,
            id: change.id ?? `change-${Date.now()}-${index}`,
          })
        );
      }
    } catch (e) {
      // If parsing failed, maybe try to strip trailing comma and add closing braces
      try {
        let fixedContent = content;
        // Strip trailing comma if exists
        fixedContent = fixedContent.replace(/,\s*$/, '');
        // Try adding braces
        const openBraces = (fixedContent.match(/{/g) || []).length;
        const closeBraces = (fixedContent.match(/}/g) || []).length;
        const openBrackets = (fixedContent.match(/\[/g) || []).length;
        const closeBrackets = (fixedContent.match(/]/g) || []).length;

        fixedContent += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
        fixedContent += '}'.repeat(Math.max(0, openBraces - closeBraces));

        const parsed = JSON.parse(fixedContent);
        if (parsed.proposedChanges && Array.isArray(parsed.proposedChanges)) {
          return parsed.proposedChanges.map(
            (change: Omit<ProposedChange, 'id'> & { id?: string }, index: number) => ({
              ...change,
              id: change.id ?? `change-${Date.now()}-${index}`,
            })
          );
        }
      } catch {
        // Still failed, continue to next block
      }
    }
  }
  return null;
};
