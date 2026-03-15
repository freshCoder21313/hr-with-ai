// src/features/cv-management/types.ts

import { Resume, ResumeData } from '@/types';

/**
 * Represents the state for the CV Management feature, managed by Zustand.
 */
export interface CVManagementState {
  // The ID of the currently selected resume for management.
  selectedCvId: number | null;

  // The fully parsed, structured data of the selected resume.
  parsedData: ResumeData | null;

  // Represents the loading state, true when fetching list or a single CV.
  isLoading: boolean;

  // Holds any error message that occurs during data fetching.
  error: string | null;

  // A lightweight list of all available resumes for selection.
  cvList: Pick<Resume, 'id' | 'fileName' | 'createdAt'>[];

  // --- Actions ---

  /**
   * Fetches the list of all resumes from the database.
   */
  fetchCVList: () => Promise<void>;

  /**
   * Selects a CV by its ID, fetching its full parsed data.
   * @param cvId The ID of the resume to select.
   */
  selectCv: (cvId: number) => Promise<void>;

  /**
   * Updates the parsed data of the currently selected CV both in the store and database.
   * @param newData A partial object of the ResumeData to be merged.
   */
  updateParsedData: (newData: Partial<ResumeData>) => Promise<void>;

  /**
   * Sets the global loading state for the page.
   * @param loading The new loading state.
   */
  setLoading: (loading: boolean) => void;
}
