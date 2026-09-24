import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCVStudio } from './useCVStudio';
import { useJobStore } from '../stores/useJobStore';

vi.mock('@/lib/db', () => ({
  db: {
    resumes: {
      toArray: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    getMainCV: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/services/resume/cvChatService', () => ({
  streamCVChatMessage: vi.fn(),
}));

vi.mock('@/services/ai/aiConfigService', () => ({
  getStoredAIConfig: vi.fn().mockReturnValue({ apiKey: 'test-key' }),
}));

vi.mock('@/services/resume/resumeAIService', () => ({
  tailorResumeV2: vi.fn(),
  parseResumeToJSON: vi.fn(),
}));

vi.mock('@/services/ai/rootPrompt', () => ({
  ROOT_PROMPT: 'root prompt',
}));

vi.mock('@/events/apiKeyEvents', () => ({
  openApiKeyModal: vi.fn(),
}));

async function renderReadyCVStudio() {
  const view = renderHook(() => useCVStudio());
  await waitFor(() => expect(view.result.current.state.isLoading).toBe(false));
  return view;
}

describe('useCVStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useJobStore.setState({ jobs: [], globalPrompt: 'default' });
  });

  it('should initialize with loading state', async () => {
    const { result } = renderHook(() => useCVStudio());
    expect(result.current.state.isLoading).toBe(true);
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
  });

  it('should provide UI state setters', async () => {
    const { result } = await renderReadyCVStudio();

    act(() => {
      result.current.ui.setIsJobPanelOpen(false);
    });

    expect(result.current.ui.isJobPanelOpen).toBe(false);
  });

  it('should add a job via handleAddJob', async () => {
    const { result } = await renderReadyCVStudio();

    act(() => {
      result.current.actions.handleAddJob();
    });

    expect(result.current.state.jobs).toHaveLength(1);
  });

  it('should remove a job via handleRemoveJob', async () => {
    const { result } = await renderReadyCVStudio();

    act(() => {
      result.current.actions.handleAddJob();
    });

    const jobId = result.current.state.jobs[0].id;

    act(() => {
      result.current.actions.handleRemoveJob(jobId);
    });

    expect(result.current.state.jobs).toHaveLength(0);
  });

  it('should toggle job selection', async () => {
    const { result } = await renderReadyCVStudio();

    act(() => {
      result.current.actions.handleAddJob();
    });

    const jobId = result.current.state.jobs[0].id;

    act(() => {
      result.current.actions.handleToggleJobSelection(jobId);
    });

    expect(result.current.state.selectedJobs.has(jobId)).toBe(true);

    act(() => {
      result.current.actions.handleToggleJobSelection(jobId);
    });

    expect(result.current.state.selectedJobs.has(jobId)).toBe(false);
  });

  it('should update template via UI actions', async () => {
    const { result } = await renderReadyCVStudio();

    act(() => {
      result.current.ui.setTemplate('classic');
    });

    expect(result.current.ui.template).toBe('classic');
  });

  it('exports jobs to jobs-backup.json', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloads.push(this.download);
    });
    useJobStore.setState({
      jobs: [{ id: '1', company: 'C', title: 'T', description: 'D', customPrompt: '' }],
      globalPrompt: 'gp',
    });
    const { result } = await renderReadyCVStudio();
    act(() => result.current.actions.handleExportJobs());
    expect(downloads[0]).toBe('jobs-backup.json');
  });

  it('does not overwrite globalPrompt when the import payload lacks one', async () => {
    vi.stubGlobal(
      'FileReader',
      class {
        onload: ((ev: { target: { result: string } }) => void) | null = null;
        readAsText() {
          this.onload?.({ target: { result: JSON.stringify({ jobs: [] }) } });
        }
      }
    );
    const originalCreate = document.createElement.bind(document);
    const fakeInput = {
      type: '',
      accept: '',
      onchange: null as null | ((e: unknown) => void),
      click() {
        this.onchange?.({ target: { files: [new File(['{}'], 'jobs.json')] } });
      },
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
      tag === 'input' ? (fakeInput as unknown as HTMLElement) : originalCreate(tag)
    );
    const { result } = await renderReadyCVStudio();
    act(() => result.current.actions.handleImportJobs());
    expect(useJobStore.getState().globalPrompt).toBe('default');
  });
});
