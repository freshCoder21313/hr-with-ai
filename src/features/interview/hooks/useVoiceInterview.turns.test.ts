import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Collection } from 'dexie';
import { db } from '@/lib/db';
import { useInterviewStore } from '@/features/interview/interviewStore';
import type { Interview, Message, UserSettings } from '@/types';

vi.mock('./useSpeechToText', () => ({
  useSpeechToText: () => ({
    transcript: '',
    interimTranscript: '',
    isSupported: true,
    error: null,
    resetTranscript: vi.fn(),
    startListening: vi.fn(),
    stopListening: vi.fn(),
  }),
}));

const ttsStop = vi.fn();
vi.mock('./useTextToSpeech', () => ({
  useTextToSpeech: () => ({ isSpeaking: false, speak: vi.fn(), stop: ttsStop }),
}));

vi.mock('./useAudioRecorder', () => ({
  useAudioRecorder: () => ({ audioLevel: 0, startRecording: vi.fn(), cancelRecording: vi.fn() }),
}));

const feedStreamChunk = vi.fn();
let onSentence: ((s: string) => void) | null = null;

vi.mock('@/services/voice/voiceInterviewService', () => ({
  voiceInterviewService: {
    feedStreamChunk: (...a: unknown[]) => feedStreamChunk(...a),
    reset: vi.fn(),
    flush: vi.fn(),
    setOnSentenceCallback: (cb: ((s: string) => void) | null) => {
      onSentence = cb;
    },
  },
}));
vi.mock('@/services/voice/speechToTextService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/voice/speechToTextService')>();
  return {
    ...actual,
    speechToTextService: { ...actual.speechToTextService, setOnSilenceCallback: vi.fn() },
  };
});

vi.mock('@/services/ai/aiConfigService', () => ({ getStoredAIConfig: () => ({ apiKey: 'k' }) }));
vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: () => Promise.resolve({}),
}));
vi.mock('@/lib/logger');
vi.mock('@/lib/db');
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn() } }));

const streamInterviewMessage = vi.fn();
vi.mock('@/services/interview/interviewAIService', () => ({
  streamInterviewMessage: (...args: unknown[]) => streamInterviewMessage(...args),
}));

import { useVoiceInterview } from './useVoiceInterview';
import { useVoiceInterviewStore } from '@/features/interview/stores/voiceInterviewStore';

const INTERVIEW_ID = 11;
const NEWEST_TURN_ID = 900;

const makeInterview = (messages: Message[]): Interview => ({
  id: INTERVIEW_ID,
  createdAt: 1,
  company: 'Acme',
  jobTitle: 'Engineer',
  interviewerPersona: 'Friendly',
  jobDescription: 'jd',
  resumeText: 'cv',
  language: 'en-US',
  status: 'in_progress' as Interview['status'],
  messages,
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

  return {
    iterable: { [Symbol.asyncIterator]: () => iterator } as AsyncGenerator<string, void, unknown>,
    emit: async (chunk: string) => {
      await act(async () => {
        const pending = resolveNext;
        if (pending) {
          resolveNext = null;
          pending({ value: chunk, done: false });
        } else {
          queue.push(chunk);
        }
        await Promise.resolve();
      });
    },
    finish: async () => {
      await act(async () => {
        done = true;
        resolveNext?.({ value: undefined as unknown as string, done: true });
        resolveNext = null;
        await Promise.resolve();
      });
    },
  };
}

/** Transcript contents of the real store, in order. */
const contents = () =>
  useInterviewStore.getState().currentInterview!.messages.map((m) => m.content);

const messages = () => useInterviewStore.getState().currentInterview!.messages;

/** Payload of the most recent Dexie write. */
const lastPersisted = (updateMock: Mock) =>
  updateMock.mock.calls.at(-1)![1] as { messages: Message[] };

let updateMock: Mock;

beforeEach(() => {
  vi.clearAllMocks();
  onSentence = null;
  updateMock = vi.fn().mockResolvedValue(1);
  vi.mocked(db.interviews.update).mockImplementation(updateMock);
  vi.mocked(db.userSettings.orderBy).mockReturnValue({
    first: vi.fn().mockResolvedValue({ autoFinishEnabled: false, forceToolsEnabled: false }),
  } as unknown as Collection<UserSettings, number>);
  useInterviewStore.setState({
    currentInterview: null,
    isLoading: false,
    error: null,
    activeGenerationId: null,
    streamingMessageId: null,
  });
});

describe('useVoiceInterview turn handling', () => {
  it('passes prior turns only, never duplicating the just-sent user message', async () => {
    const prior: Message[] = [{ role: 'model', content: 'Hello', timestamp: 1 }];
    // The store tail is the message the caller just added.
    useInterviewStore.getState().setInterview(makeInterview(prior));
    streamInterviewMessage.mockImplementation(async function* () {
      yield 'ok';
    });

    const { result } = renderHook(() => useVoiceInterview());
    await act(async () => {
      await result.current.sendTextMessage('My turn');
    });

    expect(contents()).toContain('My turn');
    const [history, newMessage] = streamInterviewMessage.mock.calls[0];
    expect(history).toEqual(prior);
    expect(newMessage).toBe('My turn');
  });

  it('marks the streaming turn as an error instead of writing a plain message', async () => {
    useInterviewStore.getState().setInterview(makeInterview([]));
    // An async generator that throws mirrors how the real service surfaces an
    // upstream failure: the `for await` in the hook throws inside its try block.
    streamInterviewMessage.mockImplementation(async function* (): AsyncGenerator<string> {
      yield 'partial';
      throw new Error('upstream 500');
    });

    const { result } = renderHook(() => useVoiceInterview());
    await act(async () => {
      await result.current.sendTextMessage('Boom');
    });

    const modelTurns = messages().filter((m) => m.role === 'model');
    expect(modelTurns).toHaveLength(1);
    expect(modelTurns[0]).toMatchObject({ content: 'upstream 500', isError: true });
    // The user's turn must survive the failure.
    expect(contents()).toContain('Boom');
  });

  it('persists the voice transcript to Dexie', async () => {
    // Voice turns had no Dexie write, so the transcript vanished on reload and
    // end-session feedback read an empty history.
    useInterviewStore.getState().setInterview(makeInterview([]));
    streamInterviewMessage.mockImplementation(async function* () {
      yield 'the spoken answer';
    });

    const { result } = renderHook(() => useVoiceInterview());
    await act(async () => {
      await result.current.sendTextMessage('a question');
    });

    expect(updateMock).toHaveBeenCalled();
    expect(lastPersisted(updateMock).messages.map((m) => m.content)).toEqual([
      'a question',
      'the spoken answer',
    ]);
  });

  it('persists a partially spoken answer when the stream fails', async () => {
    useInterviewStore.getState().setInterview(makeInterview([]));
    streamInterviewMessage.mockImplementation(async function* (): AsyncGenerator<string> {
      yield 'half an ans';
      throw new Error('upstream 500');
    });

    const { result } = renderHook(() => useVoiceInterview());
    await act(async () => {
      await result.current.sendTextMessage('a question');
    });

    // The failed turn is persisted in its marked-as-error form, with the
    // user's question intact — matching the text-mode failure path.
    expect(updateMock).toHaveBeenCalled();
    expect(lastPersisted(updateMock).messages).toEqual([
      expect.objectContaining({ role: 'user', content: 'a question' }),
      expect.objectContaining({ role: 'model', isError: true }),
    ]);
  });

  it('a newer claim resolves an undelivered voice turn to an explicit error', async () => {
    // The claim is what protects the transcript: the turn stops looking like
    // a finished answer the moment a competing generation takes ownership.
    const first = deferredStream();
    useInterviewStore.getState().setInterview(makeInterview([]));
    vi.mocked(streamInterviewMessage).mockReturnValue(first.iterable);

    const { result } = renderHook(() => useVoiceInterview());
    let firstSend!: Promise<void>;
    await act(async () => {
      firstSend = result.current.sendTextMessage('first question');
    });
    await first.emit('first answer');

    const firstTurnId = messages().find((m) => m.role === 'model')!.timestamp;
    useInterviewStore.getState().beginGeneration();

    const firstTurn = messages().find((m) => m.timestamp === firstTurnId)!;
    expect(firstTurn.isError).toBe(true);
    expect(firstTurn.content).not.toContain('first answer');

    await first.finish();
    await act(async () => {
      await firstSend;
    });
  });

  it('discards chunks from a superseded voice turn instead of corrupting the newest one', async () => {
    const first = deferredStream();
    useInterviewStore.getState().setInterview(makeInterview([]));
    vi.mocked(streamInterviewMessage).mockReturnValue(first.iterable);

    const { result } = renderHook(() => useVoiceInterview());
    let firstSend!: Promise<void>;
    await act(async () => {
      firstSend = result.current.sendTextMessage('first question');
    });

    // A newer generation claims ownership and opens its own turn while the
    // first stream is still open.
    useInterviewStore.getState().beginGeneration();
    useInterviewStore
      .getState()
      .addMessage({ role: 'model', content: '', timestamp: NEWEST_TURN_ID });

    // The stale stream now emits. It must not land in the newest turn.
    await first.emit('stale chunk');
    await act(async () => {
      await firstSend;
    });

    expect(messages().find((m) => m.timestamp === NEWEST_TURN_ID)!.content).toBe('');
  });

  it('refuses a second voice send while a turn is in flight', async () => {
    const first = deferredStream();
    useInterviewStore.getState().setInterview(makeInterview([]));
    vi.mocked(streamInterviewMessage).mockReturnValue(first.iterable);

    const { result } = renderHook(() => useVoiceInterview());
    let firstSend!: Promise<void>;
    await act(async () => {
      firstSend = result.current.sendTextMessage('first question');
    });

    streamInterviewMessage.mockImplementation(async function* () {
      yield 'should not happen';
    });
    await act(async () => {
      await result.current.sendTextMessage('second question');
    });

    // The guarded send never reached the provider and left no trace.
    expect(streamInterviewMessage).toHaveBeenCalledTimes(1);
    expect(contents()).not.toContain('second question');

    await first.finish();
    await act(async () => {
      await firstSend;
    });
    expect(useInterviewStore.getState().activeGenerationId).toBeNull();
    expect(useInterviewStore.getState().isLoading).toBe(false);
  });

  it('releases generation ownership when the voice stream fails', async () => {
    useInterviewStore.getState().setInterview(makeInterview([]));
    streamInterviewMessage.mockImplementation(async function* (): AsyncGenerator<string> {
      throw new Error('boom');
      yield '';
    });

    const { result } = renderHook(() => useVoiceInterview());
    await act(async () => {
      await result.current.sendTextMessage('question');
    });

    // A stuck claim would make every later send a no-op.
    expect(useInterviewStore.getState().activeGenerationId).toBeNull();
    expect(useInterviewStore.getState().isLoading).toBe(false);
  });

  it('feeds streamed sentences to the TTS queue', async () => {
    useInterviewStore.getState().setInterview(makeInterview([]));
    streamInterviewMessage.mockImplementation(async function* () {
      yield 'Hello there. How are you?';
    });

    const { result } = renderHook(() => useVoiceInterview());
    await act(async () => {
      await result.current.sendTextMessage('hi');
    });

    expect(feedStreamChunk).toHaveBeenCalledWith('Hello there. How are you?');
    expect(onSentence).toBeTypeOf('function');
  });

  it('stops TTS, drops the sentence callback and clears the queue on unmount', () => {
    // Switching to text mode unmounts this hook. Synthesis left running, or
    // speech left queued, would keep talking over the text room.
    useVoiceInterviewStore.setState({ ttsQueue: ['uns spoken sentence'] });
    useInterviewStore.getState().setInterview(makeInterview([]));

    const { unmount } = renderHook(() => useVoiceInterview());
    expect(ttsStop).toHaveBeenCalledTimes(0);

    unmount();

    expect(ttsStop).toHaveBeenCalled();
    expect(onSentence).toBeNull();
    expect(useVoiceInterviewStore.getState().ttsQueue).toEqual([]);
  });

  it('drops queued speech when the call ends', () => {
    // Ending the call unmounts the hook; speech left queued would be spoken
    // into the feedback view.
    useVoiceInterviewStore.setState({ ttsQueue: ['uns spoken sentence'] });
    useInterviewStore.getState().setInterview(makeInterview([]));

    const { result } = renderHook(() => useVoiceInterview());
    act(() => result.current.endInterview());

    expect(useVoiceInterviewStore.getState().ttsQueue).toEqual([]);
  });
});
