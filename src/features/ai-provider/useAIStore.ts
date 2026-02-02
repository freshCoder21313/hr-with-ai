import { create } from 'zustand';
import { AIService } from './ai.service';
import { AIConfig, AIModelProvider } from './types';
import { loadUserSettings } from '@/services/settingsService';

interface AIState {
  instance: AIService | null;
  isLoading: boolean;
  error: string | null;
  initService: () => Promise<void>;
  getInstance: () => Promise<AIService>;
}

export const useAIStore = create<AIState>((set, get) => ({
  instance: null,
  isLoading: false,
  error: null,
  initService: async () => {
    try {
      set({ isLoading: true, error: null });
      const settings = await loadUserSettings();

      const apiKey = settings.apiKey;
      const baseUrl = settings.baseUrl;
      const modelId = settings.defaultModel;

      // Determine provider logic similar to existing geminiService
      let provider: AIModelProvider = 'google';
      if (baseUrl) {
        provider = 'openai';
      }

      if (!apiKey) {
        set({ isLoading: false });
        return;
      }

      const config: AIConfig = {
        apiKey,
        baseUrl: baseUrl || undefined,
        modelId: modelId || undefined,
        provider,
      };

      const service = new AIService(config);
      set({ instance: service, isLoading: false });
    } catch (e) {
      console.error('Failed to init AI Service', e);
      set({ error: (e as Error).message, isLoading: false });
    }
  },
  getInstance: async () => {
    const { instance, initService } = get();
    if (instance) return instance;
    await initService();
    const newInstance = get().instance;
    if (!newInstance)
      throw new Error('AI Service not initialized. Please check your API Key in settings.');
    return newInstance;
  },
}));
