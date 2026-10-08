import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageCoachingTab } from './LanguageCoachingTab';
import { Interview, InterviewStatus, CommunicationCoachingReport } from '@/types';

vi.mock('@/services/interview/communicationCoachService', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/interview/communicationCoachService')
  >('@/services/interview/communicationCoachService');
  return {
    ...actual,
    generateCommunicationReport: vi.fn(),
  };
});

vi.mock('@/lib/db', () => ({
  db: {
    interviews: {
      get: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(1),
    },
  },
}));

describe('LanguageCoachingTab component', () => {
  const mockInterview: Interview = {
    id: 101,
    createdAt: Date.now(),
    company: 'Grab',
    jobTitle: 'Senior Frontend Engineer',
    interviewerPersona: 'Tech Lead',
    jobDescription: 'React, TypeScript, System Design',
    resumeText: 'Frontend Engineer with 5 years experience',
    language: 'vi-VN',
    status: InterviewStatus.COMPLETED,
    messages: [
      { role: 'model', content: 'Chào bạn, bạn tối ưu React app thế nào?', timestamp: 1000 },
      {
        role: 'user',
        content: 'Dạ, ừm, tôi dùng React.memo và useMemo để giảm re-render, kiểu như vậy.',
        timestamp: 2000,
      },
    ],
  };

  const mockReport: CommunicationCoachingReport = {
    generatedAt: Date.now(),
    sourceLanguage: 'Vietnamese (vi-VN)',
    targetLanguage: 'English (US / International)',
    overallScore: {
      fluencyScore: 8.5,
      vocabularyScore: 7.5,
      professionalismScore: 9,
    },
    summaryTakeaway: 'Strong technical grasp. Consider reducing casual fillers like "ừm".',
    deliveryMetrics: {
      totalWords: 35,
      fillerWords: [{ word: 'ừm', count: 1, contextSnippets: ['...ừm...'] }],
      hedgingPhrasesCount: 1,
      averageAnswerWordCount: 18,
      pacingAssessment: 'good',
    },
    turnAnalyses: [
      {
        questionIndex: 1,
        question: 'Chào bạn, bạn tối ưu React app thế nào?',
        originalAnswer: 'Dạ, ừm, tôi dùng React.memo và useMemo để giảm re-render, kiểu như vậy.',
        grammarIssues: [
          {
            originalSnippet: 'kiểu như vậy',
            correction: 'nhằm hạn chế tối đa các lần tính toán dư thừa',
            explanation: 'Dùng cấu trúc câu chỉ mục đích rõ ràng thay vì kết câu cụt.',
          },
        ],
        vocabularyUpgrades: [
          {
            casualWord: 'giảm re-render',
            professionalAlternative:
              'tối ưu hóa chu kỳ render và ngăn ngừa redundant re-computations',
            reason: 'Sử dụng thuật ngữ kỹ thuật chính xác.',
          },
        ],
        languageTransformation: {
          targetLanguage: 'English (US / International)',
          directTranslation:
            'Well, um, I use React.memo and useMemo to reduce re-rendering, like that.',
          professionalUpgrade:
            'I leverage memoization techniques such as React.memo and useMemo to prevent unnecessary component re-renders and optimize rendering performance.',
          frameworkBreakdown: {
            action: 'Implemented React.memo and useMemo on critical list components',
            result: 'Reduced dropped frames during complex updates',
          },
          keyVocabulary: [
            {
              term: 'Memoization',
              phonetic: '/ˌmem.oʊ.əˈzeɪ.ʃən/',
              meaning: 'Kỹ thuật lưu kết quả tính toán để tái sử dụng',
              sampleUsage: 'Leveraged memoization to avoid redundant computations.',
            },
          ],
        },
      },
    ],
  };

  it('renders onboarding card when no report exists, showing target language options', () => {
    render(<LanguageCoachingTab interview={mockInterview} />);

    expect(screen.getByText('Interview Language & Communication Coach')).toBeInTheDocument();
    expect(screen.getByText('Choose Target Practice Language')).toBeInTheDocument();
    expect(screen.getByText(/Analyze Language & Communication/i)).toBeInTheDocument();
  });

  it('allows selecting a custom target language without limits', () => {
    render(<LanguageCoachingTab interview={mockInterview} />);

    const customBtn = screen.getByText('Custom / Other');
    fireEvent.click(customBtn);

    const input = screen.getByPlaceholderText(/Enter any target language/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Swedish (Svenska)' } });
    expect(input).toHaveValue('Swedish (Svenska)');
  });

  it('renders full coaching report with scores, tabs, and vocabulary when report is provided', () => {
    const interviewWithReport: Interview = {
      ...mockInterview,
      feedback: {
        score: 8,
        summary: 'Good',
        strengths: [],
        weaknesses: [],
        keyQuestionAnalysis: [],
        mermaidGraphCurrent: 'graph TD;',
        mermaidGraphPotential: 'graph TD;',
        recommendedResources: [],
        communicationCoach: mockReport,
      },
    };

    render(<LanguageCoachingTab interview={interviewWithReport} />);

    // Scores
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();

    // Summary
    expect(screen.getByText(/Strong technical grasp/i)).toBeInTheDocument();

    // Sub-tab 1: Multilingual Transformation
    expect(screen.getByText(/Multilingual Transformation/i)).toBeInTheDocument();
    expect(screen.getByText(/Executive \/ STAR Upgrade/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Memoization/i).length).toBeGreaterThanOrEqual(1);

    // Switch to Sub-tab 2: Grammar & Word Choices
    fireEvent.click(screen.getByRole('tab', { name: /Grammar & Word Choices/i }));
    expect(screen.getByText(/Grammar & Syntax Adjustments/i)).toBeInTheDocument();
    expect(screen.getByText('kiểu như vậy')).toBeInTheDocument();
    expect(screen.getByText('nhằm hạn chế tối đa các lần tính toán dư thừa')).toBeInTheDocument();

    // Switch to Sub-tab 3: Delivery & Filler Words
    fireEvent.click(screen.getByRole('tab', { name: /Delivery & Filler Words/i }));
    expect(screen.getByText(/Filler Words Detected/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ừm/).length).toBeGreaterThanOrEqual(1);
  });

  it('triggers report generation and updates report state when button is clicked', async () => {
    const { generateCommunicationReport } =
      await import('@/services/interview/communicationCoachService');
    (generateCommunicationReport as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockReport
    );

    const onReportUpdated = vi.fn();
    render(<LanguageCoachingTab interview={mockInterview} onReportUpdated={onReportUpdated} />);

    const analyzeBtn = screen.getByText(/Analyze Language & Communication/i);
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(generateCommunicationReport).toHaveBeenCalledWith(mockInterview, 'en-US');
    });

    await waitFor(() => {
      expect(onReportUpdated).toHaveBeenCalledWith(mockReport);
    });
  });

  it('shows live validation warning and blocks submit for invalid custom language', async () => {
    const { generateCommunicationReport } =
      await import('@/services/interview/communicationCoachService');
    const mockFn = vi.fn();
    (generateCommunicationReport as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockFn);

    render(<LanguageCoachingTab interview={mockInterview} />);

    // Click Custom Mode
    fireEvent.click(screen.getByText(/Custom \/ Other/i));

    const input = screen.getByPlaceholderText(/Enter any target language/i);
    // Enter purely numbers
    fireEvent.change(input, { target: { value: '123456' } });

    expect(screen.getByText(/Tên ngôn ngữ không hợp lệ/i)).toBeInTheDocument();

    // Click Analyze
    const analyzeBtn = screen.getByText(/Analyze Language & Communication/i);
    fireEvent.click(analyzeBtn);

    // Verify generateCommunicationReport was NOT called
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('renders unrecognized language banner when report has isTargetLanguageRecognized false', () => {
    const unrecognizedReport: CommunicationCoachingReport = {
      ...mockReport,
      isTargetLanguageRecognized: false,
      requestedLanguage: 'AlienDialect99',
      unrecognizedLanguageMessage: 'Không thể nhận diện ngôn ngữ AlienDialect99.',
    };

    const interviewWithUnrecognizedReport = {
      ...mockInterview,
      feedback: {
        score: 8,
        summary: 'Good',
        strengths: [],
        weaknesses: [],
        keyQuestionAnalysis: [],
        mermaidGraphCurrent: '',
        mermaidGraphPotential: '',
        recommendedResources: [],
        communicationCoach: unrecognizedReport,
      },
    };

    render(<LanguageCoachingTab interview={interviewWithUnrecognizedReport} />);

    expect(
      screen.getByText(/Không nhận diện được ngôn ngữ: “AlienDialect99”/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Không thể nhận diện ngôn ngữ AlienDialect99/i)).toBeInTheDocument();
  });

  it('displays incremental circular progress ring with stage text during generation', async () => {
    const { generateCommunicationReport } =
      await import('@/services/interview/communicationCoachService');
    let resolveGen: (value: CommunicationCoachingReport) => void;
    const promise = new Promise<CommunicationCoachingReport>((resolve) => {
      resolveGen = resolve;
    });
    (generateCommunicationReport as unknown as ReturnType<typeof vi.fn>).mockReturnValue(promise);

    render(<LanguageCoachingTab interview={mockInterview} />);

    // Click Analyze
    fireEvent.click(screen.getByText(/Analyze Language & Communication/i));

    // Progress loading ring should be visible
    expect(screen.getByText(/Đang phân tích phản hồi & ngôn ngữ.../i)).toBeInTheDocument();
    expect(
      screen.getByText(/Đang trích xuất đối thoại & câu trả lời phỏng vấn.../i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Ngôn ngữ thực hành: en-US/i)).toBeInTheDocument();

    // Resolve generation
    resolveGen!(mockReport);

    await waitFor(() => {
      expect(screen.getByText(/Communication & Language Coaching Report/i)).toBeInTheDocument();
    });
  });

  it('preserves and hydrates report when re-mounted or updated via interview prop', async () => {
    const interviewWithReport: Interview = {
      ...mockInterview,
      feedback: {
        score: 8,
        summary: 'Good',
        strengths: [],
        weaknesses: [],
        keyQuestionAnalysis: [],
        mermaidGraphCurrent: 'graph TD;',
        mermaidGraphPotential: 'graph TD;',
        recommendedResources: [],
        communicationCoach: mockReport,
      },
    };

    // First render with blank mockInterview
    const { rerender } = render(<LanguageCoachingTab interview={mockInterview} />);
    expect(screen.getByText('Interview Language & Communication Coach')).toBeInTheDocument();

    // Re-render with updated interview prop (as happens when tab switches back)
    rerender(<LanguageCoachingTab interview={interviewWithReport} />);

    await waitFor(() => {
      expect(screen.getByText(/Communication & Language Coaching Report/i)).toBeInTheDocument();
      expect(screen.getByText('8.5')).toBeInTheDocument();
    });
  });

  it('cleans up progress interval and prevents updates if unmounted during generation', async () => {
    const { generateCommunicationReport } =
      await import('@/services/interview/communicationCoachService');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    let resolveGen: (value: CommunicationCoachingReport) => void;
    const pendingPromise = new Promise<CommunicationCoachingReport>((resolve) => {
      resolveGen = resolve;
    });
    (generateCommunicationReport as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      pendingPromise
    );

    const onReportUpdated = vi.fn();
    const { unmount } = render(
      <LanguageCoachingTab interview={mockInterview} onReportUpdated={onReportUpdated} />
    );

    fireEvent.click(screen.getByText(/Analyze Language & Communication/i));

    // Component is generating
    expect(screen.getByText(/Đang phân tích phản hồi & ngôn ngữ.../i)).toBeInTheDocument();

    // Now unmount before completion
    unmount();

    // Verify clearInterval was called upon unmount
    expect(clearIntervalSpy).toHaveBeenCalled();

    // Resolve the promise after unmount
    resolveGen!(mockReport);

    // Wait a tick to ensure no late state update throws or fires callback
    await new Promise((r) => setTimeout(r, 50));
    expect(onReportUpdated).not.toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });
});
