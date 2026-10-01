import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { VoiceInterviewRoom } from './VoiceInterviewRoom';
import { useInterviewStore } from '@/features/interview/interviewStore';
import { notificationService } from '@/services/core/notificationService';
import { InterviewStatus, type Interview } from '@/types';

vi.mock('@/features/interview/hooks/useVoiceInterview', () => ({
  useVoiceInterview: () => mockVoiceHook,
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('./VoiceSettingsDialog', () => ({ VoiceSettingsDialog: () => null }));
vi.mock('./VoiceMicButton', () => ({ VoiceMicButton: () => <button type="button" /> }));
vi.mock('./AIAvatarSpeaking', () => ({ AIAvatarSpeaking: () => null }));
vi.mock('./AudioVisualizer', () => ({ AudioVisualizer: () => null }));
vi.mock('./ChatArea', () => ({ ChatArea: () => null }));
vi.mock('@/components/shared/MarkdownRenderer', () => ({ default: () => null }));

const MOCK_INTERVIEW: Interview = {
  id: 1,
  createdAt: 1,
  jobTitle: 'Engineer',
  company: 'Acme',
  status: InterviewStatus.IN_PROGRESS,
  messages: [{ role: 'model', content: 'Hello', timestamp: 1 }],
  interviewerPersona: 'p',
  jobDescription: 'd',
  resumeText: 'r',
  language: 'en-US',
};

const endInterview = vi.fn();
const startListening = vi.fn();
const stopAndSend = vi.fn();
const sendTextMessage = vi.fn();

const mockVoiceHook = {
  isListening: false,
  isSpeaking: false,
  state: 'idle',
  transcript: '',
  interimTranscript: '',
  speechError: null,
  permissionError: null,
  speechSupported: true,
  audioLevel: 0,
  startListening,
  stopAndSend,
  sendTextMessage,
  endInterview,
};

beforeEach(() => {
  vi.clearAllMocks();

  useInterviewStore.setState({
    currentInterview: MOCK_INTERVIEW,
    isLoading: false,
    error: null,
    activeGenerationId: null,
    streamingMessageId: null,
  });
});

describe('VoiceInterviewRoom end call', () => {
  it('confirms exactly once and then ends the session', async () => {
    const confirm = vi.spyOn(notificationService, 'confirm').mockResolvedValue(true);
    const onEndInterview = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <VoiceInterviewRoom onEndInterview={onEndInterview} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /end call/i }));

    await waitFor(() => expect(onEndInterview).toHaveBeenCalledTimes(1));
    // The old path confirmed here *and* in the parent, so one click raised two
    // dialogs.
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(endInterview).toHaveBeenCalled();
  });

  it('does not end the session when the user declines', async () => {
    const confirm = vi.spyOn(notificationService, 'confirm').mockResolvedValue(false);
    const onEndInterview = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <VoiceInterviewRoom onEndInterview={onEndInterview} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /end call/i }));

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(onEndInterview).not.toHaveBeenCalled();
    expect(endInterview).not.toHaveBeenCalled();
  });

  it('shows a blocking busy state while feedback is generated', async () => {
    vi.spyOn(notificationService, 'confirm').mockResolvedValue(true);
    let releaseEnd!: () => void;
    const onEndInterview = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseEnd = resolve;
        })
    );

    render(
      <MemoryRouter>
        <VoiceInterviewRoom onEndInterview={onEndInterview} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /end call/i }));

    // The voice branch had no overlay at all, so the room looked live while
    // feedback was still generating.
    await waitFor(() => expect(screen.getByText('Analyzing Interview')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /end call/i })).toBeDisabled();

    // The overlay stays up until the room unmounts: on success the parent
    // navigates to the feedback view, so clearing it here would flash a live
    // room over an interview that is already finalized.
    releaseEnd();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('Analyzing Interview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /end call/i })).toBeDisabled();
  });

  it('ignores repeated clicks while ending', async () => {
    vi.spyOn(notificationService, 'confirm').mockResolvedValue(true);
    const onEndInterview = vi.fn(() => new Promise<void>(() => {}));

    render(
      <MemoryRouter>
        <VoiceInterviewRoom onEndInterview={onEndInterview} />
      </MemoryRouter>
    );

    const endCall = screen.getByRole('button', { name: /end call/i });
    fireEvent.click(endCall);
    await waitFor(() => expect(endCall).toBeDisabled());

    // A stuck confirmation must not queue a second end-session run.
    fireEvent.click(endCall);
    expect(onEndInterview).toHaveBeenCalledTimes(1);
  });

  it('releases the blocker when ending fails so the user can try again', async () => {
    vi.spyOn(notificationService, 'confirm').mockResolvedValue(true);
    const error = vi.spyOn(notificationService, 'error').mockImplementation(() => {});
    const onEndInterview = vi.fn().mockRejectedValue(new Error('feedback failed'));

    render(
      <MemoryRouter>
        <VoiceInterviewRoom onEndInterview={onEndInterview} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /end call/i }));

    await waitFor(() => expect(error).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /end call/i })).not.toBeDisabled()
    );
    expect(screen.queryByText('Analyzing Interview')).not.toBeInTheDocument();
  });

  it('disables the mic while a turn is streaming', () => {
    useInterviewStore.setState({ isLoading: true });

    render(
      <MemoryRouter>
        <VoiceInterviewRoom onEndInterview={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('AI is responding…')).toBeInTheDocument();
  });

  it('surfaces the store error in the voice room', () => {
    useInterviewStore.setState({ error: 'Answer received but could not be saved.' });

    render(
      <MemoryRouter>
        <VoiceInterviewRoom onEndInterview={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Answer received but could not be saved.');
  });
  it('passes its confirmation to the parent so the dialog is not raised twice', async () => {
    vi.spyOn(notificationService, 'confirm').mockResolvedValue(true);
    // The real parent signature: it must receive `true` and skip its own
    // confirmation, otherwise one End Call shows two dialogs.
    const onEndInterview = vi.fn(async (alreadyConfirmed?: boolean) => {
      if (!alreadyConfirmed)
        await notificationService.confirm({ title: 'End Interview', message: '' });
    });

    render(
      <MemoryRouter>
        <VoiceInterviewRoom onEndInterview={onEndInterview} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /end call/i }));

    await waitFor(() => expect(onEndInterview).toHaveBeenCalledWith(true));
    expect(notificationService.confirm).toHaveBeenCalledTimes(1);
  });
});
