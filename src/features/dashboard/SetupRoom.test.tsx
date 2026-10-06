import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SetupRoom from './SetupRoom';

// Mock useSetupRoom
const mockApplyPreset = vi.fn();
const mockHandleChange = vi.fn();
const mockHandleSubmit = vi.fn((e) => e.preventDefault());

vi.mock('./hooks/useSetupRoom', () => ({
  useSetupRoom: () => ({
    state: {
      isParsing: false,
      isExtracting: false,
      isAnalyzing: false,
      isResearching: false,
      isStarting: false,
      savedResumes: [],
      selectedResumeId: null,
      resumeAnalysis: null,
      savedJobs: [],
      selectedJobId: 'new',
      isJobModalOpen: false,
      isTailorModalOpen: false,
      resumeToTailor: null,
      showMainCVCloneDialog: false,
      pendingMainResume: null,
      isCloning: false,
      formData: {
        company: 'Stripe',
        jobTitle: 'Backend Engineer',
        interviewerPersona: 'Alex strict persona',
        jobDescription: 'Go, microservices, databases',
        resumeText: '',
        language: 'en-US',
        difficulty: 'hard',
        type: 'coding',
        mode: 'hybrid',
        companyStatus: 'Growing',
        interviewContext: 'Video Call',
        isPanel: false,
      },
    },
    actions: {
      handleChange: mockHandleChange,
      handleSubmit: mockHandleSubmit,
      applyPreset: mockApplyPreset,
      handleResumeSelect: vi.fn(),
      handleSaveJob: vi.fn(),
      handleDeleteJob: vi.fn(),
      handleSelectSavedJob: vi.fn(),
      handleConfirmClone: vi.fn(),
      handleDeleteResume: vi.fn(),
      handleToggleMain: vi.fn(),
      handleTailorClick: vi.fn(),
      handleGenerateTailoredResume: vi.fn(),
      handleAutoFill: vi.fn(),
      handleResearchCompany: vi.fn(),
      handleFileUpload: vi.fn(),
      handleAnalyzeResume: vi.fn(),
      handleSelectJob: vi.fn(),
      setShowMainCVCloneDialog: vi.fn(),
      setIsTailorModalOpen: vi.fn(),
      setIsJobModalOpen: vi.fn(),
      loadData: vi.fn(),
      handleTogglePanel: vi.fn(),
      handleAutoFillFromRawJD: vi.fn(),
    },
  }),
}));

vi.mock('@/components/shared/SEO', () => ({
  default: () => null,
}));

describe('SetupRoom (3-Step Wizard & Presets)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Step 1 (Job & Role) by default with presets', () => {
    render(
      <MemoryRouter>
        <SetupRoom />
      </MemoryRouter>
    );

    expect(screen.getByText(/Setup Interview Room/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick-Start Presets/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Senior Frontend/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next: Candidate Resume/i })).toBeInTheDocument();
  });

  it('inspects a preset details dialog and applies it to auto-advance to resume step', () => {
    render(
      <MemoryRouter>
        <SetupRoom />
      </MemoryRouter>
    );

    const googlePreset = screen.getByText(/Google Senior Frontend/i);
    fireEvent.click(googlePreset);

    // Inspection dialog displays full sample job details
    expect(screen.getByText(/Review the pre-configured parameters/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Alex, Senior Engineering Manager at Google/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Sample Job Description/i)).toBeInTheDocument();

    // Click confirm apply button
    const applyBtn = screen.getByRole('button', { name: /Apply & Continue to Resume/i });
    fireEvent.click(applyBtn);

    expect(mockApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        company: 'Google',
        jobTitle: 'Senior Frontend Engineer',
        difficulty: 'hard',
        type: 'coding',
      })
    );

    // After preset selection, step advances to resume
    expect(screen.getByRole('button', { name: /Next: AI Persona & Format/i })).toBeInTheDocument();
  });

  it('allows navigating across all 3 steps', () => {
    render(
      <MemoryRouter>
        <SetupRoom />
      </MemoryRouter>
    );

    // Step 1 -> Click Next
    fireEvent.click(screen.getByRole('button', { name: /Next: Candidate Resume/i }));

    // Now in Step 2
    expect(screen.getByRole('button', { name: /Next: AI Persona & Format/i })).toBeInTheDocument();

    // Step 2 -> Click Next
    fireEvent.click(screen.getByRole('button', { name: /Next: AI Persona & Format/i }));

    // Now in Step 3
    expect(screen.getByRole('button', { name: /Enter Interview Room/i })).toBeInTheDocument();
    expect(screen.getByText(/Session Summary/i)).toBeInTheDocument();

    // Step 3 -> Click Back to Resume
    fireEvent.click(screen.getByRole('button', { name: /Back to Resume/i }));
    expect(screen.getByRole('button', { name: /Next: AI Persona & Format/i })).toBeInTheDocument();
  });
});
