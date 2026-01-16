import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Interview, Message, InterviewStatus } from '@/types';

interface InterviewState {
  currentInterview: Interview | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setInterview: (interview: Interview) => void;
  addMessage: (message: Message) => void;
  updateStatus: (status: InterviewStatus) => void;
  updateCode: (code: string) => void;
  updateWhiteboard: (data: string) => void;
  updateLastMessage: (content: string) => void;
  clearInterview: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useInterviewStore = create<InterviewState>()(
  persist(
    (set) => ({
      currentInterview: null,
      isLoading: false,
      error: null,

      setInterview: (interview) => set({ currentInterview: interview }),
      
      addMessage: (message) => set((state) => {
        if (!state.currentInterview) return state;
        return {
          currentInterview: {
            ...state.currentInterview,
            messages: [...state.currentInterview.messages, message]
          }
        };
      }),

      updateLastMessage: (content) => set((state) => {
        if (!state.currentInterview || state.currentInterview.messages.length === 0) return state;
        const messages = [...state.currentInterview.messages];
        const lastMsg = messages[messages.length - 1];
        messages[messages.length - 1] = { ...lastMsg, content };
        return {
          currentInterview: {
            ...state.currentInterview,
            messages
          }
        };
      }),

      updateStatus: (status) => set((state) => {
        if (!state.currentInterview) return state;
        return {
          currentInterview: {
            ...state.currentInterview,
            status
          }
        };
      }),

      updateCode: (code) => set((state) => {
        if (!state.currentInterview) return state;
        return {
          currentInterview: {
            ...state.currentInterview,
            code
          }
        };
      }),

      updateWhiteboard: (data) => set((state) => {
        if (!state.currentInterview) return state;
        return {
          currentInterview: {
            ...state.currentInterview,
            whiteboard: data
          }
        };
      }),

      clearInterview: () => set({ currentInterview: null, error: null }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error })
    }),
    {
      name: 'interview-storage',
      storage: createJSONStorage(() => localStorage), // Keep it simple with localStorage for now
      partialize: (state) => ({ currentInterview: state.currentInterview }), // Only persist the interview data
    }
  )
);
