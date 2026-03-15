import { create } from 'zustand';
import { db } from '@/lib/db';
import type { ResumeData } from '@/types';

// TYPES
type Status = 'idle' | 'loading' | 'success' | 'error';

interface CvInfo {
  id: number;
  fileName: string;
  createdAt: string;
}

// Represents a message in the chat widget
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface CVManagementState {
  // State
  cvList: CvInfo[];
  selectedCvId: number | null;
  parsedData: ResumeData | null;
  jobDescription: string;
  analysisResult: string | null; // Placeholder for tailoring result
  chatHistory: ChatMessage[];

  // Statuses
  listStatus: Status;
  selectionStatus: Status;
  uploadStatus: Status;
  updateStatus: Status;
  tailorStatus: Status;
  chatStatus: Status;

  // Errors
  listError: string | null;
  selectionError: string | null;
  uploadError: string | null;
  updateError: string | null;
  tailorError: string | null;
  chatError: string | null;

  // Actions
  fetchCVList: () => Promise<void>;
  selectCv: (cvId: number) => Promise<void>;
  uploadCv: (file: File) => Promise<number | undefined>;
  updateParsedData: (field: keyof ResumeData, value: any) => Promise<void>;
  setJobDescription: (jd: string) => void;
  tailorCv: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
}

export const useCVManagement = create<CVManagementState>((set, get) => ({
  // Initial State
  cvList: [],
  selectedCvId: null,
  parsedData: null,
  jobDescription: '',
  analysisResult: null,
  chatHistory: [],

  // Initial Statuses
  listStatus: 'idle',
  selectionStatus: 'idle',
  uploadStatus: 'idle',
  updateStatus: 'idle',
  tailorStatus: 'idle',
  chatStatus: 'idle',

  // Initial Errors
  listError: null,
  selectionError: null,
  uploadError: null,
  updateError: null,
  tailorError: null,
  chatError: null,

  // --- ACTIONS ---

  fetchCVList: async () => {
    set({ listStatus: 'loading', listError: null });
    try {
      const allCvs = await db.resumes.orderBy('createdAt').reverse().toArray();
      set({
        cvList: allCvs.map((cv) => ({
          id: cv.id as number,
          fileName: cv.fileName,
          createdAt: new Date(cv.createdAt).toISOString(),
        })),
        listStatus: 'success',
      });
    } catch (e) {
      console.error(e);
      const error = e instanceof Error ? e.message : 'Failed to fetch CV list.';
      set({ listStatus: 'error', listError: error });
    }
  },

  selectCv: async (cvId: number) => {
    set({ selectionStatus: 'loading', selectedCvId: cvId, parsedData: null, selectionError: null });
    try {
      const cvData = await db.resumes.get(cvId);
      if (cvData) {
        set({ parsedData: cvData.parsedData || null, selectionStatus: 'success' });
      } else {
        throw new Error('CV not found in the database.');
      }
    } catch (e) {
      console.error(e);
      const error = e instanceof Error ? e.message : 'Failed to load CV data.';
      set({ selectionStatus: 'error', selectionError: error });
    }
  },

  uploadCv: async (file: File) => {
    set({ uploadStatus: 'loading', uploadError: null });
    try {
      // This is a placeholder for the actual CV parsing and saving logic.
      // It should call the service that parses the CV and returns the structured data.
      // For now, we simulate a successful upload and add it to Dexie.
      console.log('Simulating CV upload and parsing for:', file.name);
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network/parsing delay

      const newCv = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        content: 'file_content_placeholder', // In a real scenario, this would be handled differently
        parsedData: {
          personalInfo: {
            name: 'John Doe (from new CV)',
            email: 'john.doe@example.com',
            phone: '123-456-7890',
          },
          workExperience: [],
          education: [],
          skills: [],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newId = await db.resumes.add(newCv as any);
      set({ uploadStatus: 'success' });
      get().fetchCVList(); // Refresh the list
      return newId;
    } catch (e) {
      console.error(e);
      const error = e instanceof Error ? e.message : 'Failed to upload and process CV.';
      set({ uploadStatus: 'error', uploadError: error });
      return undefined;
    }
  },

  updateParsedData: async (field, value) => {
    const { selectedCvId, parsedData } = get();
    if (!selectedCvId || !parsedData) return;

    set({ updateStatus: 'loading', updateError: null });

    // Optimistic update
    const updatedData = { ...parsedData, [field]: value };
    set({ parsedData: updatedData });

    try {
      await db.resumes.update(selectedCvId, { parsedData: updatedData });
      set({ updateStatus: 'success' });
    } catch (e) {
      console.error(e);
      const error = e instanceof Error ? e.message : 'Failed to save changes.';
      set({ updateStatus: 'error', updateError: error, parsedData: parsedData }); // Revert on error
    }
  },

  setJobDescription: (jd: string) => {
    set({ jobDescription: jd });
  },

  tailorCv: async () => {
    set({ tailorStatus: 'loading', tailorError: null });
    try {
      // Placeholder for AI analysis logic
      console.log('Simulating CV tailoring analysis...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const result =
        "Analysis complete: \n- Matched 8/10 keywords. \n- Recommend highlighting 'TypeScript' experience. \n- Consider rephrasing project descriptions to include 'Agile methodology'.";
      set({ analysisResult: result, tailorStatus: 'success' });
    } catch (e) {
      console.error(e);
      const error = e instanceof Error ? e.message : 'Failed to analyze CV.';
      set({ tailorStatus: 'error', tailorError: error });
    }
  },

  sendMessage: async (message: string) => {
    const newMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: message };
    set((state) => ({
      chatHistory: [...state.chatHistory, newMessage],
      chatStatus: 'loading',
    }));

    // AI response placeholder
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const aiResponse: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `This is a simulated AI response to: "${message}". In a real application, this would be a response from an LLM based on the CV data.`,
    };
    set((state) => ({
      chatHistory: [...state.chatHistory, aiResponse],
      chatStatus: 'idle',
    }));
  },

  clearChat: () => {
    set({ chatHistory: [] });
  },
}));
