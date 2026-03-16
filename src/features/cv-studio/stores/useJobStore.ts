import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// A simple unique ID generator to avoid adding new dependencies, as per the design.
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export interface Job {
  id: string;
  company: string;
  title: string;
  description: string;
  customPrompt: string;
}

// Omit actions from the state that gets persisted.
type StorableJobStoreState = Omit<JobStoreState, 'actions'>;

export interface JobStoreState {
  jobs: Job[];
  globalPrompt: string;
  actions: {
    addJob: (jobData: Omit<Job, 'id'>) => void;
    updateJob: (job: Job) => void;
    deleteJob: (jobId: string) => void;
    importJobs: (jobs: Omit<Job, 'id'>[]) => void;
    setGlobalPrompt: (prompt: string) => void;
    // Add an action to overwrite jobs for the import functionality
    overwriteJobs: (jobs: Job[]) => void;
  };
}

export const useJobStore = create<JobStoreState>()(
  persist(
    (set, get) => ({
      jobs: [],
      globalPrompt:
        'You are a world-class resume tailoring expert. Your task is to rewrite the provided resume to be a perfect fit for the following job description. Focus on quantifying achievements, using strong action verbs, and incorporating keywords from the job description. The output must be in the JSON Resume format.',
      actions: {
        addJob: (jobData) =>
          set((state) => ({ jobs: [...state.jobs, { ...jobData, id: generateUniqueId() }] })),
        updateJob: (updatedJob) =>
          set((state) => ({
            jobs: state.jobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)),
          })),
        deleteJob: (jobId) =>
          set((state) => ({
            jobs: state.jobs.filter((job) => job.id !== jobId),
          })),
        importJobs: (importedJobs) => {
          const currentJobs = get().jobs;
          const newJobs = importedJobs.map((jobData) => ({ ...jobData, id: generateUniqueId() }));
          set({ jobs: [...currentJobs, ...newJobs] });
        },
        setGlobalPrompt: (prompt) => set({ globalPrompt: prompt }),
        overwriteJobs: (jobs) => set({ jobs: jobs }),
      },
    }),
    {
      name: 'smart-tailor-job-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist the state, not the actions
      partialize: (state): StorableJobStoreState => ({
        jobs: state.jobs,
        globalPrompt: state.globalPrompt,
      }),
    }
  )
);
