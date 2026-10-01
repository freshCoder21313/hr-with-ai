import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CVChatPanel } from './CVChatPanel';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ProposedChange } from '../utils/cvChatUtils';
import type { Resume } from '@/types/resume';

const makeChange = (id: string): ProposedChange => ({
  id,
  section: 'basics',
  action: 'update',
  newData: { name: 'John Doe' },
  explanation: 'Update basics',
});
const mainCV = {
  id: 1,
  name: 'Main',
  parsedData: { basics: { name: 'John Doe' } },
} as unknown as Resume;

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const renderPanel = (pendingChangeId: string | null) => {
  const props = {
    messages: [],
    isTyping: false,
    mainCV,
    chatResumeId: 1,
    pendingChanges: [makeChange('c1'), makeChange('c2')],
    pendingChangeId,
    resumes: [mainCV],
    contextResumeId: undefined,
    contextJobId: undefined,
    jobs: [],
    onSendMessage: vi.fn(),
    onAcceptChange: vi.fn().mockResolvedValue(undefined),
    onRejectChange: vi.fn(),
    onChatCVChange: vi.fn(),
    onRenameCV: vi.fn(),
    onDeleteCV: vi.fn(),
    onCreateNewCV: vi.fn(),
    onSetContextResumeId: vi.fn(),
    onSetContextJobId: vi.fn(),
    onGitHubImportOpen: vi.fn(),
  };
  render(
    <TooltipProvider>
      <CVChatPanel {...props} />
    </TooltipProvider>
  );
};

describe('CVChatPanel while a proposed change is saving', () => {
  it('disables every card action so no enabled button silently no-ops', () => {
    renderPanel('c1');

    const accepts = screen.getAllByRole('button', { name: /accept|saving/i });
    const rejects = screen.getAllByRole('button', { name: /reject/i });
    expect(accepts).toHaveLength(2);
    expect(rejects).toHaveLength(2);
    for (const button of [...accepts, ...rejects]) {
      expect(button).toBeDisabled();
    }
  });

  it('re-enables all card actions once the save settles', () => {
    renderPanel(null);

    const accepts = screen.getAllByRole('button', { name: /accept/i });
    const rejects = screen.getAllByRole('button', { name: /reject/i });
    expect(accepts).toHaveLength(2);
    expect(rejects).toHaveLength(2);
    for (const button of [...accepts, ...rejects]) {
      expect(button).toBeEnabled();
    }
  });
});
