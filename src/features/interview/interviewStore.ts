import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Interview, Message, InterviewStatus } from '@/types';

/**
 * Monotonic id for AI generations. Module-scoped so ids stay unique across
 * store resets within a session (a stale writer must never be mistaken for
 * the current one).
 */
let generationCounter = 0;

/**
 * Content written over a model turn whose stream was cut short by a newer
 * send. Matches the wording of the ordinary failure path so the transcript
 * renders the same error card and offers Retry.
 */
export const INTERRUPTED_MESSAGE = 'Interrupted by a newer message.';

interface InterviewState {
  currentInterview: Interview | null;
  isLoading: boolean;
  error: string | null;
  /**
   * Identity of the AI generation currently allowed to mutate this interview.
   * `null` = idle. See `beginGeneration` for the single-flight contract.
   */
  activeGenerationId: number | null;
  /**
   * Timestamp of the model turn currently being streamed, or `null` when no
   * answer is in flight. Decides "undelivered": `beginGeneration` interrupts
   * exactly this turn, because a turn whose stream already delivered a
   * non-empty answer has cleared it and must survive a later claim.
   */
  streamingMessageId: number | null;
  /** Claims the single in-flight model turn; `null` releases it. */
  setStreamingMessageId: (timestamp: number | null) => void;
  // Actions
  setInterview: (interview: Interview) => void;
  addMessage: (message: Message) => void;
  updateStatus: (status: InterviewStatus) => void;
  updateCode: (code: string) => void;
  updateWhiteboard: (data: string) => void;
  updateLastMessage: (content: string) => void;
  updateMessageByTimestamp: (timestamp: number, content: string) => void;
  markMessageAsError: (timestamp: number, error: string) => void;
  markLastMessageAsError: (error: string) => void;
  removeLastMessage: () => void;
  clearInterview: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  /**
   * Claims write ownership for a new AI generation and returns its id.
   * Single-flight: a new claim invalidates any in-flight generation, whose
   * later store/DB writes are then rejected by `isGenerationCurrent`.
   */
  beginGeneration: () => number;
  isGenerationCurrent: (generationId: number) => boolean;
  /** Releases ownership, but only if the caller still holds it. */
  endGeneration: (generationId: number) => void;
}

export const useInterviewStore = create<InterviewState>()(
  persist(
    (set, get) => ({
      currentInterview: null,
      isLoading: false,
      error: null,
      activeGenerationId: null,
      streamingMessageId: null,

      setInterview: (interview) => set({ currentInterview: interview }),

      addMessage: (message) =>
        set((state) => {
          if (!state.currentInterview) return state;
          return {
            currentInterview: {
              ...state.currentInterview,
              messages: [...state.currentInterview.messages, message],
            },
          };
        }),

      updateLastMessage: (content) =>
        set((state) => {
          if (!state.currentInterview || state.currentInterview.messages.length === 0) return state;
          const messages = [...state.currentInterview.messages];
          const lastMsg = messages[messages.length - 1];
          messages[messages.length - 1] = { ...lastMsg, content };
          return {
            currentInterview: {
              ...state.currentInterview,
              messages,
            },
          };
        }),

      updateMessageByTimestamp: (timestamp, content) =>
        set((state) => {
          if (!state.currentInterview) return state;
          const messages = state.currentInterview.messages.map((msg) =>
            msg.timestamp === timestamp ? { ...msg, content } : msg
          );
          return {
            currentInterview: {
              ...state.currentInterview,
              messages,
            },
          };
        }),

      markMessageAsError: (timestamp, error) =>
        set((state) => {
          if (!state.currentInterview) return state;
          const messages = state.currentInterview.messages.map((msg) =>
            msg.timestamp === timestamp ? { ...msg, content: error, isError: true } : msg
          );
          return {
            currentInterview: {
              ...state.currentInterview,
              messages,
            },
          };
        }),

      markLastMessageAsError: (error) =>
        set((state) => {
          if (!state.currentInterview || state.currentInterview.messages.length === 0) return state;
          const messages = [...state.currentInterview.messages];
          const lastMsg = messages[messages.length - 1];
          messages[messages.length - 1] = { ...lastMsg, content: error, isError: true };
          return {
            currentInterview: {
              ...state.currentInterview,
              messages,
            },
          };
        }),

      removeLastMessage: () =>
        set((state) => {
          if (!state.currentInterview || state.currentInterview.messages.length === 0) return state;
          const messages = state.currentInterview.messages.slice(0, -1);
          return {
            currentInterview: {
              ...state.currentInterview,
              messages,
            },
          };
        }),

      updateStatus: (status) =>
        set((state) => {
          if (!state.currentInterview) return state;
          return {
            currentInterview: {
              ...state.currentInterview,
              status,
            },
          };
        }),

      updateCode: (code) =>
        set((state) => {
          if (!state.currentInterview) return state;
          return {
            currentInterview: {
              ...state.currentInterview,
              code,
            },
          };
        }),

      updateWhiteboard: (data) =>
        set((state) => {
          if (!state.currentInterview) return state;
          return {
            currentInterview: {
              ...state.currentInterview,
              whiteboard: data,
            },
          };
        }),

      clearInterview: () => set({ currentInterview: null, error: null }),

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      setStreamingMessageId: (timestamp) => set({ streamingMessageId: timestamp }),

      beginGeneration: () => {
        generationCounter += 1;
        const generationId = generationCounter;
        // One atomic write: a newer claim resolves the previous turn's
        // undelivered placeholder to an explicit error *and* takes ownership,
        // so no interleaving can leave a half-answer looking like a finished
        // model message. The new generation's own persists carry the state
        // into Dexie, so this never touches the database itself.
        set((state) => {
          const interrupted = state.streamingMessageId;
          let currentInterview = state.currentInterview;
          if (interrupted !== null && currentInterview) {
            currentInterview = {
              ...currentInterview,
              messages: currentInterview.messages.map((msg) =>
                msg.timestamp === interrupted
                  ? { ...msg, content: INTERRUPTED_MESSAGE, isError: true }
                  : msg
              ),
            };
          }
          return {
            activeGenerationId: generationId,
            streamingMessageId: null,
            ...(currentInterview !== state.currentInterview ? { currentInterview } : {}),
          };
        });
        return generationId;
      },

      isGenerationCurrent: (generationId) => get().activeGenerationId === generationId,

      endGeneration: (generationId) => {
        if (get().activeGenerationId !== generationId) return;
        set({ activeGenerationId: null });
      },
    }),
    {
      name: 'interview-storage',
      storage: createJSONStorage(() => localStorage),
      // Optimization: Do NOT persist 'currentInterview' to localStorage.
      // It contains heavy data (messages, whiteboard images) which will exceed 5MB quota.
      // We rely on IndexedDB (Dexie) for persistence. The React components will load from DB on mount.
      partialize: (_state) => ({}),
    }
  )
);
