# Design Doc: Smart Tailor Job Persistence & Customization

**Date:** 2026-03-13
**Status:** Approved

## 1. Overview

This document outlines the design for enhancing the "Smart Tailor" page. The goal is to allow users to save, manage, and customize "Job Targets" for tailoring their resumes. This includes persisting data in `localStorage`, adding advanced prompt customization, and providing import/export functionality.

## 2. Data Structure & State Management

We will implement a new Zustand store for state management, persisted to `localStorage`.

**File Location:** `src/features/smart-tailor/stores/useJobStore.ts`

### 2.1. `Job` Interface

The `Job` interface will be defined as follows to hold all necessary information.

```typescript
interface Job {
  id: string; // Unique identifier
  company: string;
  title: string;
  description: string; // Job Description (JD)
  customPrompt: string; // Custom prompt for this specific job
}
```

### 2.2. Zustand Store (`JobStore`)

The store will manage the state and provide actions for manipulation.

```typescript
interface JobStoreState {
  jobs: Job[];
  globalPrompt: string;
  actions: {
    addJob: (job: Job) => void;
    updateJob: (job: Job) => void;
    deleteJob: (jobId: string) => void;
    importJobs: (jobs: Job[]) => void;
    setGlobalPrompt: (prompt: string) => void;
  };
}
```

The `persist` middleware from Zustand will be used for automatic synchronization with `localStorage`.

## 3. UI/UX Changes (`SmartTailorPage.tsx`)

### 3.1. "Actions" Section

A new section will be added above the job list containing three buttons:

- **"Edit Global Prompt"**: Opens a modal for editing the `globalPrompt`.
- **"Import Jobs"**: Opens a file dialog to import a `json` file.
- **"Export All Jobs"**: Downloads a `json` backup of the entire store state.

### 3.2. Job Card Enhancements

- **Selection Checkbox**: Each job card will have a checkbox to select it for a batch processing run.
- **Custom Prompt Field**: A `Textarea` for the `customPrompt` will be added below the "Job Description" field.

### 3.3. Local Storage Note

A persistent note will be displayed in the "Actions" section:

> 📝 **Note:** Your Jobs list and Prompts are saved locally in this browser and are not synced to the cloud. Use the Export feature to create backups.

## 4. Workflows

### 4.1. Editing Global Prompt

1.  Clicking the "Edit Global Prompt" button opens a modal.
2.  The modal contains a large `Textarea` pre-filled with the current `globalPrompt`.
3.  On "Save", the `setGlobalPrompt` action is called to update the store.

### 4.2. Import / Export

- **Export:**
  1.  Clicking "Export All Jobs" triggers a function.
  2.  This function reads the current state (`jobs` and `globalPrompt`) from the Zustand store.
  3.  It serializes this state into a JSON string.
  4.  A file `jobs-backup.json` is created and downloaded to the user's machine.
- **Import:**
  1.  Clicking "Import Jobs" opens the system file picker.
  2.  The user selects a valid `.json` file.
  3.  The file content is read and processed within a `try...catch` block to handle errors gracefully.
  4.  If the file is not valid JSON or if the data structure is incorrect, an error notification will be shown to the user, and the import process will be aborted.
  5.  For each valid job object in the imported file, a **new unique ID will be generated** before it is added to the store. This prevents ID conflicts.
  6.  The `importJobs` action is called, which appends the new, sanitized jobs to the existing list in the store.

### 4.3. Batch Tailoring Workflow

1.  The "Start Tailoring All" button will be renamed to **"Start Tailoring Selected Jobs"**.
2.  When clicked, the application will filter the `jobs` from the store based on which ones are selected via the new checkboxes.
3.  The tailoring process will then run only on this filtered list of jobs.
4.  For each job, the final AI prompt will be constructed by combining the `globalPrompt` and the job's `customPrompt` using the following template:

    ```
    ${globalPrompt}

    --- Job-Specific Instructions ---
    ${customPrompt}
    ```

    If the `customPrompt` is empty, the "Job-Specific Instructions" section will be omitted.
