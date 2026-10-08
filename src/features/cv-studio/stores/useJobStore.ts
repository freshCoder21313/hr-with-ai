import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { Job, SavedJob, normalizeJob, toSavedJob } from '@/types/jobs';

export type { Job, SavedJob };

// Omit actions from the state that gets persisted.
type StorableJobStoreState = Omit<JobStoreState, 'actions'>;

const canUseDB = () =>
  typeof globalThis !== 'undefined' &&
  Boolean(globalThis.indexedDB) &&
  typeof db !== 'undefined' &&
  Boolean(db?.jobs);

export interface JobStoreState {
  jobs: Job[];
  globalPrompt: string;
  actions: {
    loadJobsFromDB: () => Promise<void>;
    addJob: (jobData: Partial<Job> | Omit<Job, 'id'>) => string;
    updateJob: (job: Job) => void;
    deleteJob: (jobId: string) => void;
    importJobs: (jobs: Array<Partial<Job> | Omit<Job, 'id'>>) => void;
    setGlobalPrompt: (prompt: string) => void;
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
        loadJobsFromDB: async () => {
          try {
            if (!canUseDB() || !db?.jobs?.toArray) return;
            const dbRecords = await db.jobs.toArray();
            const normalizedDbJobs = dbRecords.map((r) => normalizeJob(r));

            const currentJobs = get().jobs;
            // If DB is empty but localStorage has jobs, populate DB from localStorage
            if (normalizedDbJobs.length === 0 && currentJobs.length > 0) {
              for (const j of currentJobs) {
                try {
                  const newId = await db.jobs.add(toSavedJob(j));
                  j.id = String(newId);
                } catch (e) {
                  logger.warn('Failed to seed job to DB:', e);
                }
              }
              set({ jobs: currentJobs.map((j) => normalizeJob(j)) });
              return;
            }

            // Merge: Start with DB records, then append any local jobs not in DB
            const dbIdSet = new Set(normalizedDbJobs.map((j) => j.id));
            const extraLocalJobs: Job[] = [];

            for (const localJob of currentJobs) {
              if (!dbIdSet.has(localJob.id)) {
                try {
                  const newId = await db.jobs.add(toSavedJob(localJob));
                  extraLocalJobs.push(normalizeJob({ ...localJob, id: newId }));
                } catch (e) {
                  logger.warn('Failed to sync local job to DB:', e);
                  extraLocalJobs.push(normalizeJob(localJob));
                }
              }
            }

            set({ jobs: [...normalizedDbJobs, ...extraLocalJobs] });
          } catch (error) {
            logger.error('Failed to load jobs from DB:', error);
          }
        },

        addJob: (jobData) => {
          const normalized = normalizeJob(jobData);

          // Update local state immediately for instant UI feedback
          set((state) => ({ jobs: [...state.jobs, normalized] }));

          // Asynchronously persist to Dexie IndexedDB
          if (canUseDB() && db?.jobs?.add) {
            try {
              db.jobs
                .add(toSavedJob(normalized))
                .then((newId) => {
                  const finalId = String(newId);
                  if (finalId !== normalized.id) {
                    set((state) => ({
                      jobs: state.jobs.map((j) =>
                        j.id === normalized.id ? { ...j, id: finalId } : j
                      ),
                    }));
                  }
                })
                .catch((err) => {
                  logger.warn('Failed to persist added job to DB:', err);
                });
            } catch (err) {
              logger.warn('Error invoking db.jobs.add:', err);
            }
          }

          return normalized.id;
        },

        updateJob: (updatedJob) => {
          const normalized = normalizeJob(updatedJob);
          set((state) => ({
            jobs: state.jobs.map((job) => (job.id === normalized.id ? normalized : job)),
          }));

          const numericId = parseInt(normalized.id, 10);
          if (canUseDB() && db?.jobs?.update && Number.isFinite(numericId) && numericId > 0) {
            try {
              db.jobs.update(numericId, toSavedJob(normalized) as never).catch((err) => {
                logger.warn('Failed to update job in DB:', err);
              });
            } catch (err) {
              logger.warn('Error invoking db.jobs.update:', err);
            }
          }
        },

        deleteJob: (jobId) => {
          set((state) => ({
            jobs: state.jobs.filter((job) => job.id !== jobId),
          }));

          const numericId = parseInt(jobId, 10);
          if (canUseDB() && db?.jobs?.delete && Number.isFinite(numericId) && numericId > 0) {
            try {
              db.jobs.delete(numericId).catch((err) => {
                logger.warn('Failed to delete job from DB:', err);
              });
            } catch (err) {
              logger.warn('Error invoking db.jobs.delete:', err);
            }
          }
        },

        importJobs: (importedJobs) => {
          const currentJobs = get().jobs;
          const newJobs = importedJobs.map((jobData) => normalizeJob(jobData));
          set({ jobs: [...currentJobs, ...newJobs] });

          if (canUseDB() && db?.jobs?.add) {
            newJobs.forEach((job) => {
              try {
                db.jobs
                  ?.add(toSavedJob(job))
                  .then((newId) => {
                    const finalId = String(newId);
                    set((state) => ({
                      jobs: state.jobs.map((j) => (j.id === job.id ? { ...j, id: finalId } : j)),
                    }));
                  })
                  .catch((err) => {
                    logger.warn('Failed to persist imported job to DB:', err);
                  });
              } catch (err) {
                logger.warn('Error invoking db.jobs.add on import:', err);
              }
            });
          }
        },

        setGlobalPrompt: (prompt) => set({ globalPrompt: prompt }),

        overwriteJobs: (jobs) => set({ jobs: jobs.map((j) => normalizeJob(j)) }),
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
