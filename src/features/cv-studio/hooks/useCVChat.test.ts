import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
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

  const applyResumeParsedData = vi.fn().mockImplementation(async () => {});

  beforeEach(() => {
    vi.clearAllMocks();
    (getStoredAIConfig as any).mockReturnValue({ apiKey: 'test-key' });
  });

  it('Test A (mixed): only valid changes become pending and warning is emitted', async () => {
    const validChange = {
      proposedChanges: [
        {
          section: 'basics',
          action: 'update',
          newData: { name: 'Valid Name' },
          explanation: 'Valid change',
        },
      ],
    };
    const invalidChange = {
      proposedChanges: [
        {
          section: 'invalid_section',
          action: 'update',
          newData: { foo: 'bar' },
          explanation: 'Invalid change',
        },
      ],
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

    (streamCVChatMessage as any).mockReturnValue(
      (async function* () {
        yield cannedText;
      })()
    );

    const { result } = renderHook(() =>
      useCVChat({
        mainCV: mockMainCV,
        applyResumeParsedData,
        resumes: [mockMainCV],
        jobs: [],
        chatResumeId: 1,
      })
    );

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
    const { result } = renderHook(() =>
      useCVChat({
        mainCV: mockMainCV,
        applyResumeParsedData,
        resumes: [mockMainCV],
        jobs: [],
        chatResumeId: 1,
      })
    );

    const invalidChange = {
      id: 'c2',
      section: 'non_existent_section',
      action: 'update',
      newData: { something: 'else' },
      explanation: 'Sneaky invalid change',
    } as any;

    await act(async () => {
      await result.current.handleAcceptChange(invalidChange);
    });

    expect(db.resumes.update).not.toHaveBeenCalled();
    expect(applyResumeParsedData).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('accepts a valid change through the shared resume update contract', async () => {
    const { result } = renderHook(() =>
      useCVChat({
        mainCV: mockMainCV,
        applyResumeParsedData,
        resumes: [mockMainCV],
        jobs: [],
        chatResumeId: 1,
      })
    );

    const validChange = {
      id: 'c1',
      section: 'basics',
      action: 'update',
      newData: { name: 'Accepted Name' },
      explanation: 'Legit update',
    } as any;

    await act(async () => {
      await result.current.handleAcceptChange(validChange);
    });

    expect(applyResumeParsedData).toHaveBeenCalledTimes(1);
    expect(applyResumeParsedData).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ basics: { name: 'Accepted Name' } })
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reports a failed persist and leaves the change pending', async () => {
    applyResumeParsedData.mockRejectedValueOnce(new Error('DB Error'));

    const { result } = renderHook(() =>
      useCVChat({
        mainCV: mockMainCV,
        applyResumeParsedData,
        resumes: [mockMainCV],
        jobs: [],
        chatResumeId: 1,
      })
    );

    await act(async () => {
      await result.current.handleSendMessage;
    });

    await act(async () => {
      await result.current.handleAcceptChange({
        id: 'c1',
        section: 'basics',
        action: 'update',
        newData: { name: 'Failed Name' },
        explanation: 'Legit update',
      } as any);
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to apply change. Please try again.');
    expect(result.current.pendingChangeId).toBeNull();
  });

  it('performs one mutation when accept is double-clicked', async () => {
    let release: () => void = () => {};
    applyResumeParsedData.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );

    const { result } = renderHook(() =>
      useCVChat({
        mainCV: mockMainCV,
        applyResumeParsedData,
        resumes: [mockMainCV],
        jobs: [],
        chatResumeId: 1,
      })
    );

    const change = {
      id: 'c1',
      section: 'basics',
      action: 'update',
      newData: { name: 'Once' },
      explanation: 'Legit update',
    } as any;

    let first: Promise<void>;
    act(() => {
      first = result.current.handleAcceptChange(change);
    });
    expect(result.current.pendingChangeId).toBe('c1');

    await act(async () => {
      result.current.handleAcceptChange(change);
      release();
      await first!;
    });

    expect(applyResumeParsedData).toHaveBeenCalledTimes(1);
    expect(result.current.pendingChangeId).toBeNull();
  });

  it('keeps a change pending when reject races an in-flight accept', async () => {
    const cannedText = `\`\`\`json\n${JSON.stringify({
      proposedChanges: [
        {
          id: 'c1',
          section: 'basics',
          action: 'update',
          newData: { name: 'Once' },
          explanation: 'x',
        },
      ],
    })}\n\`\`\``;
    (streamCVChatMessage as Mock).mockReturnValue(
      (async function* () {
        yield cannedText;
      })()
    );

    let release: () => void = () => {};
    applyResumeParsedData.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );

    const { result } = renderHook(() =>
      useCVChat({
        mainCV: mockMainCV,
        applyResumeParsedData,
        resumes: [mockMainCV],
        jobs: [],
        chatResumeId: 1,
      })
    );

    await act(async () => {
      await result.current.handleSendMessage('rename me');
    });
    const change = result.current.pendingChanges![0];
    expect(change.id).toBe('c1');

    let accepting: Promise<void>;
    act(() => {
      accepting = result.current.handleAcceptChange(change);
    });
    expect(result.current.pendingChangeId).toBe('c1');

    act(() => {
      result.current.handleRejectChange(change);
    });

    // The card is mid-flight: rejecting must not yank the row out from under it.
    expect(result.current.pendingChanges?.map((c) => c.id)).toEqual(['c1']);

    await act(async () => {
      release();
      await accepting!;
    });
    expect(result.current.pendingChanges).toBeNull();
  });

  it('sets activeQuestion when AI response contains interactiveQuestion', async () => {
    const cannedText = `
I have a question for you.
\`\`\`json
{
  "interactiveQuestion": {
    "id": "q_test",
    "type": "radio",
    "question": "Which tone do you prefer?",
    "options": [
      { "id": "t1", "label": "Professional" },
      { "id": "t2", "label": "Casual" }
    ]
  }
}
\`\`\`
    `;
    (streamCVChatMessage as Mock).mockReturnValue(
      (async function* () {
        yield cannedText;
      })()
    );

    const { result } = renderHook(() =>
      useCVChat({
        mainCV: mockMainCV,
        applyResumeParsedData,
        resumes: [mockMainCV],
        jobs: [],
        chatResumeId: 1,
      })
    );

    await act(async () => {
      await result.current.handleSendMessage('help me rewrite summary');
    });

    expect(result.current.activeQuestion).not.toBeNull();
    expect(result.current.activeQuestion?.id).toBe('q_test');
    expect(result.current.activeQuestion?.options).toHaveLength(2);
  });

  it('handleAnswerQuestion sends mapped answer text and clears activeQuestion', async () => {
    const { result } = renderHook(() =>
      useCVChat({
        mainCV: mockMainCV,
        applyResumeParsedData,
        resumes: [mockMainCV],
        jobs: [],
        chatResumeId: 1,
      })
    );

    const question = {
      id: 'q_test',
      type: 'radio' as const,
      question: 'Which tone do you prefer?',
      options: [
        { id: 't1', label: 'Professional' },
        { id: 't2', label: 'Casual' },
      ],
    };

    (streamCVChatMessage as Mock).mockReturnValue(
      (async function* () {
        yield 'Great choice!';
      })()
    );

    await act(async () => {
      await result.current.handleAnswerQuestion(question, {
        selectedOptions: ['t1'],
        customText: 'Extra note',
      });
    });

    expect(result.current.activeQuestion).toBeNull();
    expect(streamCVChatMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('Tôi chọn: Professional'),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it('sets activeQuestionGroup when AI response contains interactiveQuestionGroup', async () => {
    const cannedText = `
\`\`\`json
{
  "interactiveQuestionGroup": {
    "id": "group_metrics",
    "title": "Project Impact",
    "questions": [
      {
        "id": "q1",
        "type": "radio",
        "question": "What scale?",
        "options": [{ "id": "s1", "label": "Small" }, { "id": "s2", "label": "Large" }]
      },
      {
        "id": "q2",
        "type": "input",
        "question": "Key numbers?",
        "inputPlaceholder": "e.g. 50%"
      }
    ]
  }
}
\`\`\`
    `;
    (streamCVChatMessage as Mock).mockReturnValue(
      (async function* () {
        yield cannedText;
      })()
    );

    const { result } = renderHook(() =>
      useCVChat({
        mainCV: mockMainCV,
        applyResumeParsedData,
        resumes: [mockMainCV],
        jobs: [],
        chatResumeId: 1,
      })
    );

    await act(async () => {
      await result.current.handleSendMessage('detail my latest project');
    });

    expect(result.current.activeQuestionGroup).not.toBeNull();
    expect(result.current.activeQuestionGroup?.id).toBe('group_metrics');
    expect(result.current.activeQuestionGroup?.questions).toHaveLength(2);
  });

  it('handleAnswerQuestionGroup sends formatted collective answer text and clears activeQuestionGroup', async () => {
    const { result } = renderHook(() =>
      useCVChat({
        mainCV: mockMainCV,
        applyResumeParsedData,
        resumes: [mockMainCV],
        jobs: [],
        chatResumeId: 1,
      })
    );

    const group = {
      id: 'group_test',
      title: 'Project Info',
      questions: [
        {
          id: 'q1',
          type: 'radio' as const,
          question: 'Quy mô hệ thống?',
          options: [
            { id: 'opt1', label: '10k+ users' },
            { id: 'opt2', label: '100k+ users' },
          ],
        },
        {
          id: 'q2',
          type: 'input' as const,
          question: 'Chỉ số đo lường?',
          inputPlaceholder: 'e.g. 40%',
        },
      ],
    };

    (streamCVChatMessage as Mock).mockReturnValue(
      (async function* () {
        yield 'Thanks for the details!';
      })()
    );

    await act(async () => {
      await result.current.handleAnswerQuestionGroup(group, {
        q1: { selectedOptions: ['opt2'] },
        q2: { selectedOptions: [], customText: 'Tăng 40% performance' },
      });
    });

    expect(result.current.activeQuestionGroup).toBeNull();
    expect(streamCVChatMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('Tôi đã trả lời các câu hỏi sau:'),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
    expect(streamCVChatMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('1. Quy mô hệ thống?: 100k+ users'),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
    expect(streamCVChatMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('2. Chỉ số đo lường?: Tăng 40% performance'),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it('handleSkipQuestion clears activeQuestion', async () => {
    const cannedText = `
\`\`\`json
{
  "interactiveQuestion": {
    "id": "q_skip",
    "type": "input",
    "question": "Any metric?"
  }
}
\`\`\`
    `;
    (streamCVChatMessage as Mock).mockReturnValue(
      (async function* () {
        yield cannedText;
      })()
    );

    const { result } = renderHook(() =>
      useCVChat({
        mainCV: mockMainCV,
        applyResumeParsedData,
        resumes: [mockMainCV],
        jobs: [],
        chatResumeId: 1,
      })
    );

    await act(async () => {
      await result.current.handleSendMessage('improve section');
    });

    expect(result.current.activeQuestion).not.toBeNull();

    act(() => {
      result.current.handleSkipQuestion();
    });

    expect(result.current.activeQuestion).toBeNull();
  });

  describe('Retry / Regenerate response', () => {
    it('computes canRetry correctly based on user messages and isTyping', async () => {
      (streamCVChatMessage as Mock).mockReturnValue(
        (async function* () {
          yield 'AI response';
        })()
      );

      const { result } = renderHook(() =>
        useCVChat({
          mainCV: mockMainCV,
          applyResumeParsedData,
          resumes: [mockMainCV],
          jobs: [],
          chatResumeId: 1,
        })
      );

      // Initially no user message -> canRetry is false
      expect(result.current.canRetry).toBe(false);

      await act(async () => {
        await result.current.handleSendMessage('Hello AI');
      });

      // After message settles -> canRetry is true
      expect(result.current.canRetry).toBe(true);
      expect(result.current.messages).toHaveLength(2); // [user, model]
    });

    it('retries successfully when the last turn is a valid AI message', async () => {
      (streamCVChatMessage as Mock).mockReturnValueOnce(
        (async function* () {
          yield 'First AI response';
        })()
      );

      const { result } = renderHook(() =>
        useCVChat({
          mainCV: mockMainCV,
          applyResumeParsedData,
          resumes: [mockMainCV],
          jobs: [],
          chatResumeId: 1,
        })
      );

      await act(async () => {
        await result.current.handleSendMessage('Add React skill');
      });

      expect(result.current.messages[1].content).toBe('First AI response');

      (streamCVChatMessage as Mock).mockReturnValueOnce(
        (async function* () {
          yield 'Regenerated AI response with more detail';
        })()
      );

      await act(async () => {
        await result.current.handleRetryLastResponse();
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Add React skill');
      expect(result.current.messages[1].role).toBe('model');
      expect(result.current.messages[1].content).toBe('Regenerated AI response with more detail');
      expect(streamCVChatMessage).toHaveBeenCalledTimes(2);
      expect(streamCVChatMessage).toHaveBeenLastCalledWith(
        expect.arrayContaining([expect.objectContaining({ content: 'Add React skill' })]),
        'Add React skill',
        mockMainCV.parsedData,
        expect.anything(),
        expect.anything()
      );
    });

    it('retries successfully when the last turn resulted in an error', async () => {
      (streamCVChatMessage as Mock).mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      const { result } = renderHook(() =>
        useCVChat({
          mainCV: mockMainCV,
          applyResumeParsedData,
          resumes: [mockMainCV],
          jobs: [],
          chatResumeId: 1,
        })
      );

      await act(async () => {
        await result.current.handleSendMessage('Please optimize summary');
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].isError).toBe(true);

      (streamCVChatMessage as Mock).mockReturnValueOnce(
        (async function* () {
          yield 'Recovered summary response';
        })()
      );

      await act(async () => {
        await result.current.handleRetryLastResponse();
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].isError).toBeUndefined();
      expect(result.current.messages[1].content).toBe('Recovered summary response');
    });

    it('resets old activeQuestionGroup and unaccepted pendingChanges on retry', async () => {
      const responseWithChangesAndQuestion = `
\`\`\`json
{
  "proposedChanges": [
    {
      "id": "c_old",
      "section": "basics",
      "action": "update",
      "newData": { "name": "TypeScript Master" },
      "explanation": "Update name"
    }
  ],
  "interactiveQuestionGroup": {
    "id": "qg_old",
    "title": "Level",
    "questions": [
      {
        "id": "q1",
        "type": "input",
        "question": "What level?"
      }
    ]
  }
}
\`\`\`
      `;

      (streamCVChatMessage as Mock).mockReturnValueOnce(
        (async function* () {
          yield responseWithChangesAndQuestion;
        })()
      );

      const { result } = renderHook(() =>
        useCVChat({
          mainCV: mockMainCV,
          applyResumeParsedData,
          resumes: [mockMainCV],
          jobs: [],
          chatResumeId: 1,
        })
      );

      await act(async () => {
        await result.current.handleSendMessage('Add skills');
      });

      expect(result.current.pendingChanges).toHaveLength(1);
      expect(result.current.activeQuestionGroup).not.toBeNull();

      // Retry with a response that has neither changes nor questions
      (streamCVChatMessage as Mock).mockReturnValueOnce(
        (async function* () {
          yield 'Plain text without changes';
        })()
      );

      await act(async () => {
        await result.current.handleRetryLastResponse();
      });

      expect(result.current.pendingChanges).toBeNull();
      expect(result.current.activeQuestionGroup).toBeNull();
      expect(result.current.messages[1].content).toBe('Plain text without changes');
    });

    it('does nothing when handleRetryLastResponse is called with no user messages', async () => {
      const { result } = renderHook(() =>
        useCVChat({
          mainCV: mockMainCV,
          applyResumeParsedData,
          resumes: [mockMainCV],
          jobs: [],
          chatResumeId: 1,
        })
      );

      await act(async () => {
        await result.current.handleRetryLastResponse();
      });

      expect(streamCVChatMessage).not.toHaveBeenCalled();
    });
  });
});
