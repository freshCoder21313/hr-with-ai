import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Interview, Message, InterviewStatus } from '@/types';

/**
 * Monotonic id for AI generations. Module-scoped so ids stay unique across
 * store resets within a session (a stale writer must never be mistaken for
 * the current one).
 */
let generationCounter = 0;

interface InterviewState {
  currentInterview: Interview | null;
  isLoading: boolean;
  error: string | null;
  /**
   * Identity of the AI generation currently allowed to mutate this interview.
   * `null` = idle. See `beginGeneration` for the single-flight contract.
 */
  activeGenerationId: number | null;
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

      beginGeneration: () => {
        generationCounter += 1;
        const generationId = generationCounter;
        set({ activeGenerationId: generationId });
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
