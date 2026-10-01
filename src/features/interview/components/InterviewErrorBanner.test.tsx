import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterviewErrorBanner } from './InterviewErrorBanner';
import { useInterviewStore } from '@/features/interview/interviewStore';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import { InterviewStatus, type Interview, type Message } from '@/types';

vi.mock('@/events/apiKeyEvents', () => ({ openApiKeyModal: vi.fn() }));

const PRIOR_TURNS: Message[] = [
  { role: 'model', content: 'What is a closure?', timestamp: 1 },
  { role: 'user', content: 'A function that captures scope.', timestamp: 2 },
];

/** A stored interview whose transcript ends with `tail`. */
const interviewEndingWith = (tail: Message): Interview => ({
  id: 1,
  createdAt: 1,
  jobTitle: 'Engineer',
  company: 'Acme',
  status: InterviewStatus.IN_PROGRESS,
  messages: [...PRIOR_TURNS, tail],
  interviewerPersona: 'p',
  jobDescription: 'd',
  resumeText: 'r',
  language: 'en-US',
});

const FAILED_TURN: Message = { role: 'model', content: 'boom', timestamp: 3, isError: true };
const ANSWERED_TURN: Message = { role: 'model', content: 'a delivered answer', timestamp: 3 };

beforeEach(() => {
  vi.clearAllMocks();
  useInterviewStore.setState({
    error: null,
    isLoading: false,
    activeGenerationId: null,
    streamingMessageId: null,
  });
});

describe('InterviewErrorBanner', () => {
  it('renders nothing when there is no error', () => {
    render(<InterviewErrorBanner />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('surfaces the store error text', () => {
    useInterviewStore.setState({ error: 'Answer received but could not be saved.' });
    render(<InterviewErrorBanner />);

    expect(screen.getByRole('alert')).toHaveTextContent('Answer received but could not be saved.');
  });

  it('dismisses the error so the room stays usable', () => {
    useInterviewStore.setState({ error: 'Something broke' });
    render(<InterviewErrorBanner />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss error/i }));

    expect(useInterviewStore.getState().error).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers Configure for a provider-key error', () => {
    useInterviewStore.setState({ error: 'API Key is missing. Please set it in Settings.' });
    render(<InterviewErrorBanner />);

    fireEvent.click(screen.getByRole('button', { name: /configure/i }));

    expect(openApiKeyModal).toHaveBeenCalled();
    // Acting on the error must clear it, or it reappears over the settings modal.
    expect(useInterviewStore.getState().error).toBeNull();
  });

  it('offers Retry and clears the error when the last turn failed', () => {
    const onRetry = vi.fn();
    useInterviewStore.setState({
      error: 'The AI provider stopped responding.',
      currentInterview: interviewEndingWith(FAILED_TURN),
    });
    render(<InterviewErrorBanner onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(onRetry).toHaveBeenCalled();
    expect(useInterviewStore.getState().error).toBeNull();
  });

  it('hides Retry when the last turn was delivered, since retry would do nothing', () => {
    useInterviewStore.setState({
      error: 'Something broke',
      currentInterview: interviewEndingWith(ANSWERED_TURN),
    });
    render(<InterviewErrorBanner onRetry={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('hides Retry when no retry handler is wired', () => {
    useInterviewStore.setState({
      error: 'Something broke',
      currentInterview: interviewEndingWith(FAILED_TURN),
    });
    render(<InterviewErrorBanner />);

    // An action wired to nothing is worse than no action.
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('always offers a dismissal, whatever the error', () => {
    useInterviewStore.setState({ error: 'Something unclassifiable' });
    render(<InterviewErrorBanner />);

    // No Configure and no Retry, but the user is never trapped.
    expect(screen.queryByRole('button', { name: /configure/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss error/i })).toBeInTheDocument();
  });
});
