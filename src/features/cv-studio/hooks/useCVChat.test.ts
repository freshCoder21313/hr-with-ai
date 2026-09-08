import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCVChat } from './useCVChat';
import { db } from '@/lib/db';
import { streamCVChatMessage } from '@/services/resume/cvChatService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { toast } from 'sonner';

vi.mock('@/lib/db', () => ({
  db: {
    resumes: {
      update: vi.fn().mockResolvedValue(1),
    },
  },
}));

vi.mock('@/services/resume/cvChatService', () => ({
  streamCVChatMessage: vi.fn(),
}));

vi.mock('@/services/ai/aiConfigService', () => ({
  getStoredAIConfig: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/events/apiKeyEvents', () => ({
  openApiKeyModal: vi.fn(),
}));

describe('useCVChat Task 4', () => {
  const mockMainCV = {
    id: 1,
    fileName: 'test.pdf',
    parsedData: {
      basics: { name: 'Initial' },
      work: [],
    },
    isMain: true,
  } as any;

  const setMainCV = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getStoredAIConfig as any).mockReturnValue({ apiKey: 'test-key' });
  });

  it('Test A (mixed): only valid changes become pending and warning is emitted', async () => {
    const validChange = {
      proposedChanges: [{
        section: 'basics',
        action: 'update',
        newData: { name: 'Valid Name' },
        explanation: 'Valid change'
      }]
    };
    const invalidChange = {
      proposedChanges: [{
        section: 'invalid_section',
        action: 'update',
        newData: { foo: 'bar' },
        explanation: 'Invalid change'
      }]
    };

    const cannedText = `
      Some AI text.
      \`\`\`json
      ${JSON.stringify(validChange)}
      \`\`\`
      More AI text.
      \`\`\`json
      ${JSON.stringify(invalidChange)}
      \`\`\`
    `;

    (streamCVChatMessage as any).mockReturnValue((async function* () {
      yield cannedText;
    })());

    const { result } = renderHook(() => useCVChat({
      mainCV: mockMainCV,
      setMainCV,
      resumes: [mockMainCV],
      jobs: [],
      chatResumeId: 1
    }));

    await act(async () => {
      await result.current.handleSendMessage('update my name');
    });

    // Valid change should be in pendingChanges
    expect(result.current.pendingChanges).toHaveLength(1);
    expect(result.current.pendingChanges![0].section).toBe('basics');

    // Warning should be emitted for the invalid change
    expect(toast.warning).toHaveBeenCalled();
  });

  it('Test B (write boundary): handleAcceptChange rejects invalid change object', async () => {
    const { result } = renderHook(() => useCVChat({
      mainCV: mockMainCV,
      setMainCV,
      resumes: [mockMainCV],
      jobs: [],
      chatResumeId: 1
    }));

    const invalidChange = {
      id: 'c2',
      section: 'non_existent_section',
      action: 'update',
      newData: { something: 'else' },
      explanation: 'Sneaky invalid change'
    } as any;

    await act(async () => {
      await result.current.handleAcceptChange(invalidChange);
    });

    expect(db.resumes.update).not.toHaveBeenCalled();
    expect(setMainCV).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('Test C (positive): valid change updates DB + mainCV', async () => {
    const { result } = renderHook(() => useCVChat({
      mainCV: mockMainCV,
      setMainCV,
      resumes: [mockMainCV],
      jobs: [],
      chatResumeId: 1
    }));

    const validChange = {
      id: 'c1',
      section: 'basics',
      action: 'update',
      newData: { name: 'Accepted Name' },
      explanation: 'Legit update'
    } as any;

    // Set it as pending first to test removal
    act(() => {
      // Accessing internal state is hard, so we just check side effects of handleAcceptChange
      // Actually, we can just call it directly as per requirements.
    });

    await act(async () => {
      await result.current.handleAcceptChange(validChange);
    });

    expect(db.resumes.update).toHaveBeenCalledWith(1, expect.objectContaining({
      parsedData: expect.objectContaining({
        basics: { name: 'Accepted Name' }
      })
    }));
    expect(setMainCV).toHaveBeenCalled();
  });

  it('Test D (DB failure): handles db.resumes.update failure', async () => {
    (db.resumes.update as any).mockRejectedValue(new Error('DB Error'));

    const { result } = renderHook(() => useCVChat({
      mainCV: mockMainCV,
      setMainCV,
      resumes: [mockMainCV],
      jobs: [],
      chatResumeId: 1
    }));

    const validChange = {
      id: 'c1',
      section: 'basics',
      action: 'update',
      newData: { name: 'Failed Name' },
      explanation: 'Legit update'
    } as any;

    await act(async () => {
      await result.current.handleAcceptChange(validChange);
    });

    expect(setMainCV).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
