import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { db } from '@/lib/db';
import * as interviewAIService from '@/services/interview/interviewAIService';
import InterviewRoom from './InterviewRoom';
import { Interview, InterviewStatus } from '@/types';
import { useInterviewStore } from './interviewStore';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock services and hooks
vi.mock('@/lib/db');
vi.mock('@/services/interview/interviewAIService');
vi.mock('@/components/shared/SEO', () => ({
  default: () => <></>,
}));

const mockSendMessage = vi.fn();
vi.mock('@/hooks/useInterview', () => ({
  useInterview: () => ({
    currentInterview: mockInterview,
    sendMessage: mockSendMessage,
    endSession: vi.fn(),
    retryLastMessage: vi.fn(),
    isLoading: false,
  }),
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();

const mockInterview: Interview = {
  id: 1,
  createdAt: Date.now(),
  jobTitle: 'Test Job',
  company: 'TestCo',
  status: InterviewStatus.IN_PROGRESS,
  messages: [{ role: 'model', content: 'Hello', timestamp: Date.now() }],
  interviewerPersona: 'test',
  jobDescription: 'test',
  resumeText: 'test',
  language: 'en-US',
};

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
});
