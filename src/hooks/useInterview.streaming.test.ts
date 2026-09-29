import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Collection } from 'dexie';
import { useInterview } from './useInterview';
import { useInterviewStore } from '@/features/interview/interviewStore';
import { db } from '@/lib/db';
import {
  streamInterviewMessage,
  generateInterviewFeedback,
} from '@/services/interview/interviewAIService';
import { getStoredAIConfig, type AIConfig } from '@/services/ai/aiConfigService';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import { Interview, InterviewStatus, Message, UserSettings } from '@/types';

vi.mock('@/lib/db');
vi.mock('@/lib/logger');

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
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
    vi.mocked(generateInterviewFeedback).mockResolvedValue({
      overallScore: 8,
      strengths: [],
      improvements: [],
    } as never);
    useInterviewStore.setState({
      currentInterview: null,
      isLoading: false,
      error: null,
      activeGenerationId: null,
    });
  });

  afterEach(() => {
    // A test that throws before its own `useRealTimers()` would otherwise
    // leak fake timers into every later test in the file.
    vi.useRealTimers();
    useInterviewStore.setState({ activeGenerationId: null });
  });

  /** `[[END_SESSION]]` is only honoured when the user enabled auto-finish. */
  const enableAutoFinish = () => {
    vi.mocked(db.userSettings.orderBy).mockReturnValue({
      first: vi.fn().mockResolvedValue({ autoFinishEnabled: true, forceToolsEnabled: false }),
    } as unknown as Collection<UserSettings, number>);
  };

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

  it('fails a hung stream and returns the interview to idle', async () => {
    // No provider in this codebase times the stream *body*: the 30s
    // AbortController is cleared once headers arrive. A connection that opens
    // and then stalls previously left the interview permanently processing.
    vi.useFakeTimers();
    const hung = {
      [Symbol.asyncIterator]: () => ({ next: () => new Promise<IteratorResult<string>>(() => {}) }),
    } as AsyncGenerator<string, void, unknown>;
    vi.mocked(streamInterviewMessage).mockReturnValue(hung);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('question');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await act(async () => {
      await sendPromise!;
    });
    vi.useRealTimers();

    // The turn is marked failed, not left blank or stuck.
    const failed = useInterviewStore.getState().currentInterview!.messages[1];
    expect(failed.isError).toBe(true);
    // Single-flight is released, so the user is not wedged.
    expect(useInterviewStore.getState().activeGenerationId).toBeNull();
    expect(useInterviewStore.getState().isLoading).toBe(false);
  });

  it('allows a retry after a timeout', async () => {
    vi.mocked(streamInterviewMessage).mockReturnValue(
      (async function* () {
        yield 'recovered';
      })()
    );
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    await act(async () => {
      await result.current.sendMessage('question');
    });

    // A second send is accepted, proving the claim was released.
    let second: Promise<void>;
    act(() => {
      second = result.current.sendMessage('again');
    });
    await act(async () => {
      await second!;
    });

    expect(useInterviewStore.getState().currentInterview!.messages).toHaveLength(4);
  });

  it('persists the completed answer even if the component unmounted mid-stream', async () => {
    const stream = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(stream.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result, unmount } = render();
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('question');
    });
    await stream.emit('partial');

    // The store is not React-scoped, so an in-flight generation keeps its
    // claim after unmount and must still land the answer rather than discard
    // it. Discarding here would lose a completed response.
    unmount();
    updateMock.mockClear();
    await stream.finish();
    await act(async () => {
      await sendPromise!;
    });

    expect(updateMock).toHaveBeenCalled();
    const persisted = updateMock.mock.calls.at(-1)![1] as { messages: Message[] };
    expect(persisted.messages[1].content).toBe('partial');
    expect(useInterviewStore.getState().activeGenerationId).toBeNull();
  });

  it('does not auto-end a different interview when a stale timer fires', async () => {
    vi.useFakeTimers();
    enableAutoFinish();
    vi.mocked(streamInterviewMessage).mockReturnValue(
      (async function* () {
        yield 'closing remarks[[END_SESSION]]';
      })()
    );
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('goodbye');
    });
    await act(async () => {
      await sendPromise!;
    });

    // Before the grace period elapses, the user navigates to another interview.
    act(() => {
      useInterviewStore.getState().setInterview({ ...makeInterview(), id: 999 });
    });
    navigateMock.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    vi.useRealTimers();

    // Feedback is never computed, and nothing navigates to a bogus route.
    expect(generateInterviewFeedback).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('auto-ends the same interview once the grace period elapses', async () => {
    vi.useFakeTimers();
    enableAutoFinish();
    vi.mocked(streamInterviewMessage).mockReturnValue(
      (async function* () {
        yield 'closing remarks[[END_SESSION]]';
      })()
    );
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('goodbye');
    });
    await act(async () => {
      await sendPromise!;
    });
    expect(generateInterviewFeedback).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    vi.useRealTimers();

    expect(generateInterviewFeedback).toHaveBeenCalledTimes(1);
  });

  it('gives two same-tick sends four distinct message ids', async () => {
    // The clock is pinned so both sends resolve to the same wall-clock value.
    // Under the old `Date.now() + 1` allocation, both the user messages and
    // both placeholders collapse onto one id -- and because
    // `updateMessageByTimestamp` maps over *every* message, a stream would
    // then write its answer into the user's own turn as well.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    // A fresh generator per call: `mockReturnValue` would hand back the same
    // already-exhausted generator to the second send.
    vi.mocked(streamInterviewMessage).mockImplementation(async function* () {
      yield 'answer';
    });
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    await act(async () => {
      await result.current.sendMessage('first');
    });
    await act(async () => {
      await result.current.sendMessage('second');
    });

    const messages = useInterviewStore.getState().currentInterview!.messages;
    expect(messages).toHaveLength(4);
    const ids = messages.map((m) => m.timestamp);
    expect(new Set(ids).size).toBe(4);

    // Each answer landed in its own turn, not in the user's message.
    expect(messages[0].content).toBe('first');
    expect(messages[2].content).toBe('second');
    expect(messages[1].content).toBe('answer');
    expect(messages[3].content).toBe('answer');
  });
});
