import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { db } from '@/lib/db';
import * as interviewAIService from '@/services/interview/interviewAIService';
import InterviewRoom from './InterviewRoom';
import { type Interview } from '@/types';
import { useInterviewStore } from './interviewStore';
import { TooltipProvider } from '@/components/ui/tooltip';
import { notificationService } from '@/services/core/notificationService';

// Mock services and hooks
vi.mock('@/lib/db');
vi.mock('@/services/interview/interviewAIService');
vi.mock('@/components/shared/SEO', () => ({
  default: () => <></>,
}));

const { mockSendMessage, mockEndSession, mockInterview } = vi.hoisted(() => {
  const interview = {
    id: 1,
    createdAt: Date.now(),
    jobTitle: 'Test Job',
    company: 'TestCo',
    status: 'in_progress' as Interview['status'],
    messages: [{ role: 'model' as const, content: 'Hello', timestamp: Date.now() }],
    interviewerPersona: 'test',
    jobDescription: 'test',
    resumeText: 'test',
    language: 'en-US',
  };
  return {
    mockSendMessage: vi.fn(),
    mockEndSession: vi.fn().mockResolvedValue(undefined),
    mockInterview: interview as Interview,
  };
});
vi.mock('@/features/interview/hooks/useInterview', () => ({
  useInterview: () => ({
    currentInterview: mockInterview,
    sendMessage: mockSendMessage,
    endSession: mockEndSession,
    retryLastMessage: vi.fn(),
    regenerateLastResponse: vi.fn(),
    isLoading: false,
  }),
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('InterviewRoom Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.interviews.get).mockResolvedValue(mockInterview);
    vi.mocked(db.resumes.toArray).mockResolvedValue([]);
    vi.mocked(db.userSettings.orderBy).mockReturnValue({
      first: vi.fn().mockResolvedValue({ hintsEnabled: true }),
    } as unknown as ReturnType<typeof db.userSettings.orderBy>);
    useInterviewStore.setState({
      currentInterview: mockInterview,
      setInterview: (interview: Interview) =>
        useInterviewStore.setState({ currentInterview: interview }),
      addMessage: (message) => useInterviewStore.getState().addMessage(message),
    });
  });

  it('should load an interview and allow sending a message', async () => {
    vi.mocked(interviewAIService.streamInterviewMessage).mockImplementation(async function* () {
      yield 'AI response';
    });

    render(
      <MemoryRouter initialEntries={['/interview/1']}>
        <TooltipProvider>
          <Routes>
            <Route path="/interview/:id" element={<InterviewRoom />} />
          </Routes>
        </TooltipProvider>
      </MemoryRouter>
    );

    // Wait for the interview to load
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    // Send a message
    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(input, { target: { value: 'My answer' } });

    // Find the send button by its test id
    const sendButton = screen.getByTestId('send-button');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('My answer', undefined);
    });
  });

  it('asks for confirmation before ending a text interview and aborts when declined', async () => {
    const confirm = vi.spyOn(notificationService, 'confirm').mockResolvedValue(false);

    render(
      <MemoryRouter initialEntries={['/interview/1']}>
        <TooltipProvider>
          <Routes>
            <Route path="/interview/:id" element={<InterviewRoom />} />
          </Routes>
        </TooltipProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument());

    // The header passed the click event straight into `alreadyConfirmed`, so
    // this ended the interview (and started paid feedback) with no dialog.
    fireEvent.click(screen.getByRole('button', { name: /end session/i }));

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mockEndSession).not.toHaveBeenCalled();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('ends a text interview once the user confirms', async () => {
    vi.spyOn(notificationService, 'confirm').mockResolvedValue(true);

    render(
      <MemoryRouter initialEntries={['/interview/1']}>
        <TooltipProvider>
          <Routes>
            <Route path="/interview/:id" element={<InterviewRoom />} />
          </Routes>
        </TooltipProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /end session/i }));

    await waitFor(() => expect(mockEndSession).toHaveBeenCalledTimes(1));
    expect(notificationService.confirm).toHaveBeenCalledTimes(1);
  });
});
