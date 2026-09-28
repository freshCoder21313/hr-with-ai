import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UploadStep } from './UploadStep';
import { useSkillAssessmentStore } from '@/features/skill-assessment/stores/useSkillAssessmentStore';
import { parseResume } from '@/services/resume/resumeParser';
import { extractSkills } from '@/features/skill-assessment/services/skillAssessmentAiService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { db } from '@/lib/db';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/services/resume/resumeParser', () => ({ parseResume: vi.fn() }));

vi.mock('@/services/ai/aiConfigService', () => ({ getStoredAIConfig: vi.fn() }));

vi.mock('@/features/skill-assessment/services/skillAssessmentAiService', () => ({
  extractSkills: vi.fn(),
}));

vi.mock('@/services/core/notificationService', () => ({
  notificationService: { confirm: vi.fn().mockResolvedValue(true) },
}));

vi.mock('@/lib/db', () => ({
  db: {
    resumes: { add: vi.fn(), delete: vi.fn(), toArray: vi.fn(), filter: vi.fn() },
    setMainCV: vi.fn(),
  },
}));

vi.mock('@/features/dashboard/ResumeList', () => ({ default: () => null }));

const fileOf = (name: string, type: string) => new File(['resume text'], name, { type });

const uploadFile = async (file: File) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await fireEvent.change(input, { target: { files: [file] } });
};

describe('UploadStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useSkillAssessmentStore.getState().reset();
    vi.mocked(db.resumes.toArray).mockResolvedValue([]);
    vi.mocked(getStoredAIConfig).mockReturnValue({ apiKey: '' });
  });

  it('rejects DOCX up front because the parser cannot read it', async () => {
    render(<UploadStep />);

    await uploadFile(
      fileOf('cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(/pdf or txt/i);
    expect(parseResume).not.toHaveBeenCalled();
    expect(db.resumes.add).not.toHaveBeenCalled();
  });

  it('opens the file picker from the keyboard', () => {
    render(<UploadStep />);
    const dropZone = screen.getByRole('button', { name: /drag file to this area/i });

    dropZone.focus();
    expect(document.activeElement).toBe(dropZone);

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
    fireEvent.keyDown(dropZone, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();
  });

  it('shows the extracting spinner while the resume is being parsed', async () => {
    let releaseParse: (text: string) => void = () => undefined;
    vi.mocked(parseResume).mockReturnValue(
      new Promise<string>((resolve) => {
        releaseParse = resolve;
      })
    );
    vi.mocked(extractSkills).mockResolvedValue(['React']);

    render(<UploadStep />);
    await uploadFile(fileOf('cv.txt', 'text/plain'));

    await waitFor(() => expect(screen.getByText(/extracting skills/i)).toBeInTheDocument());

    releaseParse('Skills\nReact');
    await waitFor(() => expect(screen.queryByText(/extracting skills/i)).not.toBeInTheDocument());
  });

  it('does not persist a resume whose skills could not be extracted', async () => {
    vi.mocked(parseResume).mockResolvedValue('Senior engineer.\n\nExperience\nBuilt things.');

    render(<UploadStep />);
    await uploadFile(fileOf('cv.txt', 'text/plain'));

    await waitFor(() =>
      expect(screen.getByText(/no skills could be extracted/i)).toBeInTheDocument()
    );
    expect(db.resumes.add).not.toHaveBeenCalled();
  });

  it('persists the resume only after extraction succeeds', async () => {
    vi.mocked(parseResume).mockResolvedValue(
      'Senior engineer\n\nSkills\nReact\nNode\n\nExperience\nShipped things.'
    );
    vi.mocked(extractSkills).mockResolvedValue(['React', 'Node']);
    vi.mocked(db.resumes.add).mockResolvedValue(7 as never);

    render(<UploadStep />);
    await uploadFile(fileOf('cv.txt', 'text/plain'));

    await waitFor(() => expect(db.resumes.add).toHaveBeenCalledTimes(1));
    expect(vi.mocked(db.resumes.add).mock.calls[0][0]).toMatchObject({ fileName: 'cv.txt' });
    expect(useSkillAssessmentStore.getState().extractedSkills).toEqual(
      expect.arrayContaining(['React', 'Node'])
    );
  });
});
