import { describe, it, expect, beforeEach } from 'vitest';
import { useJobStore } from './useJobStore';

describe('useJobStore', () => {
  beforeEach(() => {
    useJobStore.setState({ jobs: [], globalPrompt: 'default' });
  });

  it('should add a job', () => {
    const { addJob } = useJobStore.getState().actions;
    addJob({ company: 'Google', title: 'SWE', description: 'Build things', customPrompt: '' });

    const { jobs } = useJobStore.getState();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].company).toBe('Google');
    expect(jobs[0].title).toBe('SWE');
    expect(jobs[0].id).toBeDefined();
  });

  it('should update a job', () => {
    const { addJob, updateJob } = useJobStore.getState().actions;
    addJob({ company: 'Old', title: '', description: '', customPrompt: '' });

    const job = useJobStore.getState().jobs[0];
    updateJob({ ...job, company: 'NewCo' });

    expect(useJobStore.getState().jobs[0].company).toBe('NewCo');
  });

  it('should delete a job', () => {
    const { addJob, deleteJob } = useJobStore.getState().actions;
    addJob({ company: 'A', title: '', description: '', customPrompt: '' });
    addJob({ company: 'B', title: '', description: '', customPrompt: '' });

    const firstId = useJobStore.getState().jobs[0].id;
    deleteJob(firstId);

    expect(useJobStore.getState().jobs).toHaveLength(1);
    expect(useJobStore.getState().jobs[0].company).toBe('B');
  });

  it('should import jobs without removing existing ones', () => {
    const { addJob, importJobs } = useJobStore.getState().actions;
    addJob({ company: 'Existing', title: '', description: '', customPrompt: '' });

    importJobs([
      { company: 'New1', title: '', description: '', customPrompt: '' },
      { company: 'New2', title: '', description: '', customPrompt: '' },
    ]);

    expect(useJobStore.getState().jobs).toHaveLength(3);
  });

  it('should set global prompt', () => {
    const { setGlobalPrompt } = useJobStore.getState().actions;
    setGlobalPrompt('new prompt');
    expect(useJobStore.getState().globalPrompt).toBe('new prompt');
  });
});