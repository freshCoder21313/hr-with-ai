import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Collection } from 'dexie';
import { useInterview } from './useInterview';
import { useInterviewStore } from '@/features/interview/interviewStore';
import { db } from '@/lib/db';
import { streamInterviewMessage } from '@/services/interview/interviewAIService';
import { getStoredAIConfig, type AIConfig } from '@/services/ai/aiConfigService';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import { Interview, InterviewStatus, Message, UserSettings } from '@/types';

vi.mock('@/lib/db');
vi.mock('@/lib/logger');
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock('@/services/interview/interviewAIService');
vi.mock('@/services/ai/aiConfigService');
vi.mock('@/events/apiKeyEvents', () => ({ openApiKeyModal: vi.fn() }));
vi.mock('@/services/ai/aiProfileService', () => ({
  toSafeSyncProfiles: (p: unknown) => p,
  mergeImportedProfiles: (_l: unknown, i: unknown) => i,
  normalizeUserSettings: (s: Interview) => s,
  mirrorActiveProfileToLocalStorage: vi.fn(),
  stripImportProtectedFields: (s: Interview) => s,
}));

const INTERVIEW_ID = 7;

const makeInterview = (messages: Message[] = []): Interview => ({
  id: INTERVIEW_ID,
  createdAt: Date.now(),
  jobTitle: 'Engineer',
  company: 'Acme',
  status: InterviewStatus.IN_PROGRESS,
  messages,
  interviewerPersona: 'p',
  jobDescription: 'd',
  resumeText: 'r',
  language: 'en-US',
});

/** An async generator the test drives chunk-by-chunk. */
function deferredStream() {
  let resolveNext: ((v: IteratorResult<string>) => void) | null = null;
  const queue: string[] = [];
  let done = false;

  const iterator = {
    next: () =>
      new Promise<IteratorResult<string>>((resolve) => {
        if (queue.length > 0) {
          resolve({ value: queue.shift() as string, done: false });
        } else if (done) {
          resolve({ value: undefined as unknown as string, done: true });
        } else {
          resolveNext = resolve;
        }
      }),
    return: () => {
      done = true;
      resolveNext?.({ value: undefined as unknown as string, done: true });
      return Promise.resolve({ value: undefined as unknown as string, done: true });
    },
  };

  const iterable = {
    [Symbol.asyncIterator]: () => iterator,
  } as AsyncGenerator<string, void, unknown>;

  return {
    iterable,
    emit: (chunk: string) => act(async () => {
      const pending = resolveNext;
      if (pending) {
        // A `next()` is already awaiting: resolve it directly. Pushing to the
        // queue as well would replay the chunk on the following `next()`.
        resolveNext = null;
        pending({ value: chunk, done: false });
      } else {
        queue.push(chunk);
      }
      await Promise.resolve();
    }),
    finish: () => act(async () => {
      done = true;
      resolveNext?.({ value: undefined as unknown as string, done: true });
      resolveNext = null;
      await Promise.resolve();
    }),
  };
}

describe('useInterview streaming persistence and concurrency', () => {
  let updateMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    updateMock = vi.fn().mockResolvedValue(1);
    vi.mocked(db.interviews.update).mockImplementation(updateMock);
    vi.mocked(db.userSettings.orderBy).mockReturnValue({
      first: vi.fn().mockResolvedValue({ autoFinishEnabled: false, forceToolsEnabled: false }),
    } as unknown as Collection<UserSettings, number>);
    vi.mocked(getStoredAIConfig).mockReturnValue({
      apiKey: 'test-key',
      provider: 'google',
    } as AIConfig);

    useInterviewStore.setState({
      currentInterview: null,
      isLoading: false,
      error: null,
      activeGenerationId: null,
    });
  });

  afterEach(() => {
    useInterviewStore.setState({ activeGenerationId: null });
  });

  const render = () => renderHook(() => useInterview());

  it('persists the streamed answer, not a pre-stream snapshot', async () => {
    const stream = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(stream.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('question one');
    });

    await stream.emit('Hello');
    await stream.emit(' world');
    await stream.finish();
    await act(async () => {
      await sendPromise!;
    });

    expect(updateMock).toHaveBeenCalled();
    const persisted = updateMock.mock.calls.at(-1)![1] as { messages: Message[] };
    const roles = persisted.messages.map((m) => m.role);
    expect(roles).toEqual(['user', 'model']);
    expect(persisted.messages[1].content).toBe('Hello world');
  });

  it('keeps a message added during the stream (previously erased)', async () => {
    const stream = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(stream.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('question one');
    });

    await stream.emit('Answer');
    // Simulate a concurrent mutation arriving mid-stream.
    act(() => {
      useInterviewStore.getState().addMessage({ role: 'user', content: 'mid-stream note', timestamp: 1 });
    });
    await stream.finish();
    await act(async () => {
      await sendPromise!;
    });

    const persisted = updateMock.mock.calls.at(-1)![1] as { messages: Message[] };
    const contents = persisted.messages.map((m) => m.content);
    expect(contents).toContain('mid-stream note');
    expect(contents).toContain('Answer');
  });

  it('persists a code edit made during the stream', async () => {
    const stream = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(stream.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('solve this');
    });

    await stream.emit('Solution');
    act(() => {
      useInterviewStore.getState().updateCode('const x = 42;');
    });
    await stream.finish();
    await act(async () => {
      await sendPromise!;
    });

    const persisted = updateMock.mock.calls.at(-1)![1] as { code: string };
    expect(persisted.code).toBe('const x = 42;');
  });

  it('persists the partial answer and marks it failed when the stream errors', async () => {
    vi.mocked(streamInterviewMessage).mockReturnValue(
      (async function* () {
        yield 'Partial answ';
        throw new Error('Stream died');
      })()
    );
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    await act(async () => {
      await result.current.sendMessage('question');
    });

    // A failed turn is persisted with the error text, not the partial answer:
    // `markMessageAsError` replaces the content so the ChatArea renders the
    // error card and offers Retry. The user's own message is preserved.
    const persisted = updateMock.mock.calls.at(-1)![1] as { messages: Message[] };
    expect(persisted.messages[0].content).toBe('question');
    expect(persisted.messages[1].content).toBe('Stream died');
    expect(persisted.messages[1].isError).toBe(true);

    const storeMsg = useInterviewStore.getState().currentInterview?.messages[1];
    expect(storeMsg?.isError).toBe(true);
  });

  it('releases generation ownership when the stream fails', async () => {
    vi.mocked(streamInterviewMessage).mockReturnValue(
      (async function* () {
        throw new Error('boom');
        yield '';
      })()
    );
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    await act(async () => {
      await result.current.sendMessage('question');
    });

    expect(useInterviewStore.getState().activeGenerationId).toBeNull();
  });

  it('a superseded generation does not write to the database', async () => {
    const first = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(first.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let firstSend: Promise<void>;
    act(() => {
      firstSend = result.current.sendMessage('first question');
    });

    await first.emit('stale chunk');

    // A second generation takes ownership while the first is still streaming.
    const second = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(second.iterable);
    let secondSend: Promise<void>;
    act(() => {
      secondSend = result.current.sendMessage('second question');
    });

    const staleId = updateMock.mock.calls.length;
    await first.emit('more stale chunks');
    await first.finish();
    await act(async () => {
      await firstSend!;
    });

    // The stale generation must not have issued any further writes.
    expect(updateMock.mock.calls.length).toBe(staleId);

    await second.emit('fresh answer');
    await second.finish();
    await act(async () => {
      await secondSend!;
    });

    const persisted = updateMock.mock.calls.at(-1)![1] as { messages: Message[] };
    const contents = persisted.messages.map((m) => m.content);
    expect(contents).toContain('fresh answer');
  });

  it('does not persist to a different interview after the route changes', async () => {
    const stream = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(stream.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('question');
    });

    await stream.emit('answer');
    // User navigates to another interview mid-stream.
    act(() => {
      useInterviewStore.getState().setInterview({ ...makeInterview(), id: 99 });
    });
    updateMock.mockClear();
    await stream.finish();
    await act(async () => {
      await sendPromise!;
    });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('refuses to retry while a generation is active', async () => {
    const stream = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(stream.iterable);
    const errored: Message = { role: 'model', content: 'failed', timestamp: 2, isError: true };
    useInterviewStore.getState().setInterview(
      makeInterview([{ role: 'user', content: 'q', timestamp: 1 }, errored])
    );

    const { result } = render();
    act(() => {
      useInterviewStore.getState().beginGeneration();
    });

    await act(async () => {
      await result.current.retryLastMessage();
    });

    // The guard must short-circuit: the messages are untouched.
    expect(useInterviewStore.getState().currentInterview?.messages).toHaveLength(2);
    expect(useInterviewStore.getState().activeGenerationId).not.toBeNull();
  });

  it('allows retry once generation ownership is released', async () => {
    const stream = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(stream.iterable);
    const errored: Message = { role: 'model', content: 'failed', timestamp: 2, isError: true };
    useInterviewStore.getState().setInterview(
      makeInterview([{ role: 'user', content: 'q', timestamp: 1 }, errored])
    );

    const { result } = render();
    let sendPromise: Promise<void> | undefined;
    await act(async () => {
      sendPromise = result.current.retryLastMessage();
    });

    await waitFor(() => expect(streamInterviewMessage).toHaveBeenCalled());
    await stream.emit('retried answer');
    await stream.finish();
    await act(async () => {
      await sendPromise!;
    });

    const persisted = updateMock.mock.calls.at(-1)![1] as { messages: Message[] };
    expect(persisted.messages.at(-1)?.content).toBe('retried answer');
  });

  it('does not persist when no API key is configured', async () => {
    vi.mocked(getStoredAIConfig).mockReturnValue({
      apiKey: '',
    } as unknown as ReturnType<typeof getStoredAIConfig>);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    await act(async () => {
      await result.current.sendMessage('question');
    });

    expect(openApiKeyModal).toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(useInterviewStore.getState().activeGenerationId).toBeNull();
  });

  it('writes exactly one final write when no checkpoint is due', async () => {
    vi.mocked(streamInterviewMessage).mockReturnValue(
      (async function* () {
        yield 'one';
        yield 'two';
      })()
    );
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    await act(async () => {
      await result.current.sendMessage('question');
    });

    // No wall-clock gap between chunks, so the throttle suppresses the
    // checkpoint and only the final persist runs.
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it('flushes partial state on visibilitychange while streaming', async () => {
    const stream = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(stream.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('question');
    });

    await stream.emit('half an answer');
    updateMock.mockClear();

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    const persisted = updateMock.mock.calls[0][1] as { messages: Message[] };
    expect(persisted.messages[1].content).toBe('half an answer');

    await stream.finish();
    await act(async () => {
      await sendPromise!;
    });
  });

  it('survives a database write failure without corrupting in-memory state', async () => {
    vi.mocked(streamInterviewMessage).mockReturnValue(
      (async function* () {
        yield 'answer';
      })()
    );
    vi.mocked(db.interviews.update).mockRejectedValue(new Error('quota exceeded'));
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    await act(async () => {
      await result.current.sendMessage('question');
    });

    const storeMsg = useInterviewStore.getState().currentInterview?.messages[1];
    expect(storeMsg?.content).toBe('answer');
    expect(useInterviewStore.getState().activeGenerationId).toBeNull();
  });

  it('flushes partial state on pagehide while the document is still visible', async () => {
    // `pagehide` does not change visibilityState, so a handler gated on
    // `hidden` would silently no-op on a real page unload.
    const stream = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(stream.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('question');
    });

    await stream.emit('answer so far');
    updateMock.mockClear();

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    const persisted = updateMock.mock.calls[0][1] as { messages: Message[] };
    expect(persisted.messages[1].content).toBe('answer so far');

    await stream.finish();
    await act(async () => {
      await sendPromise!;
    });
  });

  it('removes its lifecycle listeners when the stream ends', async () => {
    vi.mocked(streamInterviewMessage).mockReturnValue(
      (async function* () {
        yield 'done';
      })()
    );
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    await act(async () => {
      await result.current.sendMessage('question');
    });

    // A lifecycle event after the turn ended must not trigger a write.
    updateMock.mockClear();
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await Promise.resolve();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
