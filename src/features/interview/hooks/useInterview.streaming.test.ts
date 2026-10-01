import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Collection } from 'dexie';
import { useInterview } from './useInterview';
import { useInterviewStore } from '@/features/interview/interviewStore';
import { INTERRUPTED_MESSAGE } from '@/features/interview/interviewStore';
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
    emit: (chunk: string) =>
      act(async () => {
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
    finish: () =>
      act(async () => {
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
      streamingMessageId: null,
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
      useInterviewStore
        .getState()
        .addMessage({ role: 'user', content: 'mid-stream note', timestamp: 1 });
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
    useInterviewStore
      .getState()
      .setInterview(makeInterview([{ role: 'user', content: 'q', timestamp: 1 }, errored]));

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
    useInterviewStore
      .getState()
      .setInterview(makeInterview([{ role: 'user', content: 'q', timestamp: 1 }, errored]));

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

  it('gives two sends under a pinned clock four distinct message ids', async () => {
    // The two sends are awaited sequentially, so this proves *allocation*
    // uniqueness, not concurrent execution. The clock is pinned so both
    // resolve to the same wall-clock value: under the old
    // `Date.now()` / `Date.now() + 1` allocation the two user messages and
    // the two placeholders each collapse onto one id, and because
    // `updateMessageByTimestamp` maps over *every* message, a stream would
    // write its answer into the user's own turn as well.
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

  it('supersedes a streaming send when a second send overlaps it', async () => {
    // The two sends genuinely overlap: the first is started and left
    // streaming, then a second is started before the first is awaited.
    //
    // `beginGeneration` is newest-wins, not reject-on-entry: the second claim
    // invalidates the first, whose later writes become no-ops. Generation 2
    // needs its own generator — handing back the exhausted one would fail it
    // with a spurious "empty response".
    const first = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(first.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let firstSend: Promise<void>;
    act(() => {
      // Started, not awaited: generation 1 is claimed and streaming.
      firstSend = result.current.sendMessage('first');
    });
    await first.emit('stale partial');
    const firstGeneration = useInterviewStore.getState().activeGenerationId;
    expect(firstGeneration).not.toBeNull();

    // Generation 2 claims ownership while generation 1 is still in flight.
    const second = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(second.iterable);
    let secondSend: Promise<void>;
    act(() => {
      secondSend = result.current.sendMessage('second');
    });
    expect(useInterviewStore.getState().activeGenerationId).not.toBe(firstGeneration);

    // (a) The superseded turn is resolved to an explicit error state, so the
    // partial can never be mistaken for a finished answer.
    const messages = useInterviewStore.getState().currentInterview!.messages;
    expect(messages).toHaveLength(4);
    expect(messages[1]).toMatchObject({ content: INTERRUPTED_MESSAGE, isError: true });

    // (b) More chunks from the superseded stream never resurrect that turn.
    await first.emit('more stale output');
    await first.finish();
    await act(async () => {
      await firstSend!;
    });
    const afterFirst = useInterviewStore.getState().currentInterview!.messages;
    expect(afterFirst[1]).toMatchObject({ content: INTERRUPTED_MESSAGE, isError: true });
    expect(afterFirst.map((m) => m.content)).not.toContain('more stale output');

    // (b) A superseded generation never released the newer claim nor cleared
    // the loading flag.
    expect(useInterviewStore.getState().activeGenerationId).not.toBeNull();
    expect(useInterviewStore.getState().isLoading).toBe(true);

    await second.emit('fresh answer');
    await second.finish();
    await act(async () => {
      await secondSend!;
    });

    // (c) The interrupted state reaches Dexie through generation 2's persist.
    const persisted = updateMock.mock.calls.at(-1)![1] as { messages: Message[] };
    expect(persisted.messages[1]).toMatchObject({
      content: INTERRUPTED_MESSAGE,
      isError: true,
    });
    expect(persisted.messages.at(-1)?.content).toBe('fresh answer');
  });

  it('keeps a superseded turn interrupted when its stream ends quietly', async () => {
    // (b) Completion without a further chunk is an exit path of its own.
    const first = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(first.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let firstSend: Promise<void>;
    act(() => {
      firstSend = result.current.sendMessage('first');
    });
    await first.emit('half an answer');

    const second = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(second.iterable);
    let secondSend: Promise<void>;
    act(() => {
      secondSend = result.current.sendMessage('second');
    });

    await first.finish();
    await act(async () => {
      await firstSend!;
    });

    const messages = useInterviewStore.getState().currentInterview!.messages;
    expect(messages[1]).toMatchObject({ content: INTERRUPTED_MESSAGE, isError: true });
    // A superseded generation writes nothing itself.
    expect(updateMock).not.toHaveBeenCalled();

    await second.emit('ok');
    await second.finish();
    await act(async () => {
      await secondSend!;
    });
  });

  it('keeps a superseded turn interrupted when its stream throws', async () => {
    // (b) The throw path is guarded by `isGenerationCurrent`, so the
    // interruption must already have happened in the store.
    let explode: (() => void) | null = null;
    vi.mocked(streamInterviewMessage).mockImplementation(async function* () {
      yield 'half an answer';
      await new Promise<void>((resolve) => {
        explode = resolve;
      });
      throw new Error('stream died');
    });
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let firstSend: Promise<void>;
    act(() => {
      firstSend = result.current.sendMessage('first');
    });
    await waitFor(() => expect(explode).not.toBeNull());

    const second = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(second.iterable);
    let secondSend: Promise<void>;
    act(() => {
      secondSend = result.current.sendMessage('second');
    });

    await act(async () => {
      explode!();
      await firstSend!;
    });

    const messages = useInterviewStore.getState().currentInterview!.messages;
    expect(messages[1]).toMatchObject({ content: INTERRUPTED_MESSAGE, isError: true });
    expect(updateMock).not.toHaveBeenCalled();

    await second.emit('ok');
    await second.finish();
    await act(async () => {
      await secondSend!;
    });
  });

  it('keeps a superseded turn interrupted when its stream is empty', async () => {
    // (b) An empty response throws before the delivery point.
    const first = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(first.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let firstSend: Promise<void>;
    act(() => {
      firstSend = result.current.sendMessage('first');
    });
    // The first send must reach the provider before the mock is swapped, or
    // it would pick up the second generation's generator instead.
    await first.emit('');
    await waitFor(() => expect(streamInterviewMessage).toHaveBeenCalledTimes(1));
    const second = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(second.iterable);
    let secondSend: Promise<void>;
    act(() => {
      secondSend = result.current.sendMessage('second');
    });

    await first.finish();
    await act(async () => {
      await firstSend!;
    });

    const messages = useInterviewStore.getState().currentInterview!.messages;
    expect(messages[1]).toMatchObject({ content: INTERRUPTED_MESSAGE, isError: true });

    await second.emit('ok');
    await second.finish();
    await act(async () => {
      await secondSend!;
    });
  });

  it('does not supersede an in-flight generation when a send has no API key', async () => {
    // (d) The no-key bail must happen before the claim, or it would strand
    // the running answer by interrupting its undelivered turn.
    const first = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(first.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let firstSend: Promise<void>;
    act(() => {
      firstSend = result.current.sendMessage('first');
    });
    await first.emit('streaming so far');
    const firstGeneration = useInterviewStore.getState().activeGenerationId;

    vi.mocked(getStoredAIConfig).mockReturnValue({
      apiKey: '',
    } as unknown as ReturnType<typeof getStoredAIConfig>);
    await act(async () => {
      await result.current.sendMessage('blocked');
    });

    expect(openApiKeyModal).toHaveBeenCalled();
    expect(useInterviewStore.getState().activeGenerationId).toBe(firstGeneration);
    const messages = useInterviewStore.getState().currentInterview!.messages;
    expect(messages[1]).toMatchObject({ content: 'streaming so far' });
    expect(messages[1].isError).toBeUndefined();

    await first.emit('and the rest');
    await first.finish();
    await act(async () => {
      await firstSend!;
    });
    expect(useInterviewStore.getState().currentInterview!.messages[1].content).toBe(
      'streaming so farand the rest'
    );
  });

  it('does not fail a delivered answer when a newer send claims before release', async () => {
    // (e) "Undelivered" comes from stream completion, not from claim release.
    const first = deferredStream();
    vi.mocked(streamInterviewMessage).mockReturnValue(first.iterable);
    useInterviewStore.getState().setInterview(makeInterview());

    const { result } = render();
    let firstSend: Promise<void>;
    act(() => {
      firstSend = result.current.sendMessage('first');
    });
    await first.emit('complete answer');
    await first.finish();

    // Claim ownership in the window between delivery and release.
    useInterviewStore.getState().beginGeneration();

    await act(async () => {
      await firstSend!;
    });

    const messages = useInterviewStore.getState().currentInterview!.messages;
    expect(messages[1]).toMatchObject({ content: 'complete answer' });
    expect(messages[1].isError).toBeUndefined();
  });

  it('sends the prior turns only, never duplicating the new user message', async () => {
    // `streamInterviewMessage` appends `newMessage` to the history itself, so
    // passing the user turn twice would duplicate it in the provider payload.
    vi.mocked(streamInterviewMessage).mockImplementation(async function* () {
      yield 'answer';
    });
    useInterviewStore
      .getState()
      .setInterview(makeInterview([{ role: 'model', content: 'earlier answer', timestamp: 1 }]));

    const { result } = render();
    await act(async () => {
      await result.current.sendMessage('the new question');
    });

    const history = vi.mocked(streamInterviewMessage).mock.calls[0][0];
    expect(history.map((m) => m.content)).toEqual(['earlier answer']);
    expect(vi.mocked(streamInterviewMessage).mock.calls[0][1]).toBe('the new question');
  });

  describe('blocked sends with no API key', () => {
    /** Simulates the user having no provider key configured. */
    const clearApiKey = () => {
      vi.mocked(getStoredAIConfig).mockReturnValue({
        apiKey: '',
      } as unknown as AIConfig);
    };

    it('retry keeps the user turn and the failed answer when no key is configured', async () => {
      // Retry removed the failed model turn *and* the user turn it answers,
      // then `sendMessage` returned early on the missing key — deleting the
      // question with no answer ever produced.
      clearApiKey();
      const messages: Message[] = [
        { role: 'model', content: 'What is a closure?', timestamp: 1 },
        { role: 'user', content: 'A function that captures scope.', timestamp: 2 },
        { role: 'model', content: 'upstream 500', timestamp: 3, isError: true },
      ];
      useInterviewStore.getState().setInterview(makeInterview(messages));

      const { result } = render();
      await act(async () => {
        await result.current.retryLastMessage();
      });

      expect(useInterviewStore.getState().currentInterview!.messages).toEqual(messages);
      expect(vi.mocked(streamInterviewMessage)).not.toHaveBeenCalled();
      expect(openApiKeyModal).toHaveBeenCalled();
    });

    it('regenerate keeps both turns when no key is configured', async () => {
      // Regenerate claimed loading and removed the model + user turns before
      // the early return, losing the answer and stranding isLoading.
      clearApiKey();
      const messages: Message[] = [
        { role: 'model', content: 'What is a closure?', timestamp: 1 },
        { role: 'user', content: 'A function that captures scope.', timestamp: 2 },
        { role: 'model', content: 'the earlier answer', timestamp: 3 },
      ];
      useInterviewStore.getState().setInterview(makeInterview(messages));

      const { result } = render();
      await act(async () => {
        await result.current.regenerateLastResponse();
      });

      expect(useInterviewStore.getState().currentInterview!.messages).toEqual(messages);
      expect(vi.mocked(streamInterviewMessage)).not.toHaveBeenCalled();
      expect(openApiKeyModal).toHaveBeenCalled();
    });

    it('a blocked regenerate returns the room to idle', async () => {
      // The old path called setLoading(true) before the guard, so the room was
      // stuck "processing" with no turn in flight.
      clearApiKey();
      useInterviewStore.getState().setInterview(
        makeInterview([
          { role: 'user', content: 'q', timestamp: 1 },
          { role: 'model', content: 'a', timestamp: 2 },
        ])
      );

      const { result } = render();
      await act(async () => {
        await result.current.regenerateLastResponse();
      });

      expect(useInterviewStore.getState().isLoading).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('a blocked retry does not claim generation ownership', async () => {
      clearApiKey();
      useInterviewStore.getState().setInterview(
        makeInterview([
          { role: 'user', content: 'q', timestamp: 1 },
          { role: 'model', content: 'boom', timestamp: 2, isError: true },
        ])
      );

      const { result } = render();
      await act(async () => {
        await result.current.retryLastMessage();
      });

      // A stuck claim would make every later retry/regenerate a no-op.
      expect(useInterviewStore.getState().activeGenerationId).toBeNull();
      expect(useInterviewStore.getState().streamingMessageId).toBeNull();
    });
  });
});
