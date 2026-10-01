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

  it('renders interactive question card when activeQuestion is passed', () => {
    const onAnswerQuestion = vi.fn();
    const props = {
      messages: [],
      isTyping: false,
      mainCV,
      chatResumeId: 1,
      pendingChanges: null,
      pendingChangeId: null,
      activeQuestion: {
        id: 'q1',
        type: 'radio' as const,
        question: 'Which role level are you targeting?',
        options: [
          { id: 'mid', label: 'Mid-Level' },
          { id: 'senior', label: 'Senior' },
        ],
      },
      resumes: [mainCV],
      contextResumeId: undefined,
      contextJobId: undefined,
      jobs: [],
      onSendMessage: vi.fn(),
      onAnswerQuestion,
      onSkipQuestion: vi.fn(),
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

    expect(screen.getByText('Which role level are you targeting?')).toBeInTheDocument();
    expect(screen.getByText('Mid-Level')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
  });

  describe('CVChatPanel Retry / Regenerate response UI', () => {
    it('renders Regenerate button on valid AI response when canRetry is true and calls onRetryLastResponse', () => {
      const onRetryLastResponse = vi.fn();
      const props = {
        messages: [
          { role: 'user' as const, content: 'Update summary', timestamp: 1 },
          { role: 'model' as const, content: 'Here is your updated summary', timestamp: 2 },
        ],
        isTyping: false,
        canRetry: true,
        mainCV,
        chatResumeId: 1,
        pendingChanges: null,
        pendingChangeId: null,
        resumes: [mainCV],
        contextResumeId: undefined,
        contextJobId: undefined,
        jobs: [],
        onSendMessage: vi.fn(),
        onRetryLastResponse,
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

      const regenButton = screen.getByRole('button', { name: /tạo lại câu trả lời|regenerate/i });
      expect(regenButton).toBeInTheDocument();
      expect(regenButton).toBeEnabled();

      regenButton.click();
      expect(onRetryLastResponse).toHaveBeenCalledTimes(1);
    });

    it('renders Retry button when the last AI message has isError: true and calls onRetryLastResponse', () => {
      const onRetryLastResponse = vi.fn();
      const props = {
        messages: [
          { role: 'user' as const, content: 'Update summary', timestamp: 1 },
          {
            role: 'model' as const,
            content: 'Sorry, error occurred',
            timestamp: 2,
            isError: true,
          },
        ],
        isTyping: false,
        canRetry: true,
        mainCV,
        chatResumeId: 1,
        pendingChanges: null,
        pendingChangeId: null,
        resumes: [mainCV],
        contextResumeId: undefined,
        contextJobId: undefined,
        jobs: [],
        onSendMessage: vi.fn(),
        onRetryLastResponse,
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

      const retryButton = screen.getByRole('button', { name: /thử lại|retry/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toBeEnabled();

      retryButton.click();
      expect(onRetryLastResponse).toHaveBeenCalledTimes(1);
    });

    it('disables retry/regenerate button when isTyping is true', () => {
      const onRetryLastResponse = vi.fn();
      const props = {
        messages: [
          { role: 'user' as const, content: 'Update summary', timestamp: 1 },
          { role: 'model' as const, content: 'Here is your updated summary', timestamp: 2 },
        ],
        isTyping: true,
        canRetry: true,
        mainCV,
        chatResumeId: 1,
        pendingChanges: null,
        pendingChangeId: null,
        resumes: [mainCV],
        contextResumeId: undefined,
        contextJobId: undefined,
        jobs: [],
        onSendMessage: vi.fn(),
        onRetryLastResponse,
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

      const regenButton = screen.getByRole('button', { name: /tạo lại câu trả lời|regenerate/i });
      expect(regenButton).toBeDisabled();
    });
  });
});
