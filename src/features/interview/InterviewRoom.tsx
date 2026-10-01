import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { notificationService } from '@/services/core/notificationService';
import { useNavigate, useParams } from 'react-router-dom';
import type { Editor, TLShapeId } from 'tldraw';
import { useInterview } from '@/features/interview/hooks/useInterview';
import { useInterviewLoader } from '@/features/interview/hooks/useInterviewLoader';
import { svgToPngBase64 } from '@/lib/svgUtils';
import { useInterviewStore } from './interviewStore';
import {
  JobRecommendation,
  resolveInterviewContentType,
  resolveInterviewInteractionMode,
} from '@/types';
import SettingsModal from '@/components/shared/SettingsModal';
import JobRecommendationModal from './JobRecommendationModal';
import SEO from '@/components/shared/SEO';
import { isNonEmptyString } from '@/lib/validation';
import { Button } from '@/components/ui/button';

import { InterviewHeader } from './components/InterviewHeader';
import { ChatArea } from './components/ChatArea';
import { InputArea } from './components/InputArea';
import { ToolModals } from './components/ToolModals';
import { VoiceInterviewRoom } from './components/VoiceInterviewRoom';
import { EndingSessionOverlay } from './components/EndingSessionOverlay';
import { InterviewErrorBanner } from './components/InterviewErrorBanner';

import { useInterviewTimer } from './hooks/useInterviewTimer';
import { useToolHandlers } from './hooks/useToolHandlers';
import { useSuggestedAction } from './hooks/useSuggestedAction';
import { useInterviewHints } from './hooks/useInterviewHints';
import { useInterviewRoomBootstrap } from './hooks/useInterviewRoomBootstrap';

const InterviewRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentInterview,
    sendMessage,
    endSession,
    retryLastMessage,
    regenerateLastResponse,
    isLoading: isProcessing,
  } = useInterview();
  const { setInterview, updateCode, updateWhiteboard } = useInterviewStore();
  const { isLoading: isInterviewLoading, error: interviewLoadError } = useInterviewLoader();

  const [inputValue, setInputValue] = useState('');
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showJobRecommendationModal, setShowJobRecommendationModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    userSettings,
    setUserSettings,
    availableResumes,
    viewMode,
    setViewMode,
    autoOpenCode,
    autoOpenWhiteboard,
  } = useInterviewRoomBootstrap(currentInterview, showSettings);

  const tools = useToolHandlers(currentInterview, isSubmitting, setIsSubmitting);
  const { setIsCodeOpen, setIsWhiteboardOpen } = tools;
  const { suggestedAction, setSuggestedAction } = useSuggestedAction(currentInterview?.messages);
  const { hints, setHints, isLoadingHints, handleGetHints } = useInterviewHints(currentInterview);

  useEffect(() => {
    if (autoOpenCode) setIsCodeOpen(true);
  }, [autoOpenCode, setIsCodeOpen]);

  useEffect(() => {
    if (autoOpenWhiteboard) setIsWhiteboardOpen(true);
  }, [autoOpenWhiteboard, setIsWhiteboardOpen]);

  const handleSendMessage = useCallback(
    async (overrideText?: string) => {
      const text = overrideText ?? inputValue;
      if (!isNonEmptyString(text) || !currentInterview) return;

      setHints(null);
      setSuggestedAction(null);

      let imageBase64: string | undefined;
      if (tools.isWhiteboardOpen && tools.editorRef.current) {
        try {
          const shapeIds = Array.from(
            tools.editorRef.current.getCurrentPageShapeIds()
          ) as TLShapeId[];
          if (shapeIds.length > 0) {
            const svg = await tools.editorRef.current.getSvg(shapeIds, { background: true });
            if (svg) {
              const pngData = await svgToPngBase64(svg);
              if (pngData) imageBase64 = pngData;
            }
          }
        } catch (e) {
          logger.error('Failed to capture whiteboard', e);
        }
      }

      setInputValue('');
      await sendMessage(text, imageBase64);
    },
    [
      inputValue,
      currentInterview,
      tools.isWhiteboardOpen,
      tools.editorRef,
      sendMessage,
      setHints,
      setSuggestedAction,
    ]
  );

  const { timer } = useInterviewTimer(isProcessing, currentInterview?.difficulty, () => {
    handleSendMessage('[Time expired - no answer provided]');
  });

  /**
   * `alreadyConfirmed` is set by the voice branch, which raises its own "End
   * Call" dialog. Without it, one End Call confirmed twice in succession.
   */
  const handleEndInterview = useCallback(
    async (alreadyConfirmed = false) => {
      if (!alreadyConfirmed) {
        const confirmed = await notificationService.confirm({
          title: 'End Interview',
          message:
            'Are you sure you want to end this interview? AI will generate feedback for you.',
        });
        if (!confirmed) return;
      }
      setIsEndingSession(true);
      try {
        await endSession();
      } catch (error) {
        notificationService.error('Failed to end session', error);
        setIsEndingSession(false);
      }
    },
    [endSession]
  );

  const handleSelectJob = useCallback(
    async (job: JobRecommendation, tailoredResumeText: string) => {
      if (!currentInterview || !id) return;
      await tools.handleSelectJob(job, tailoredResumeText, parseInt(id, 10), (i) => {
        if (i) setInterview(i);
      });
      setShowJobRecommendationModal(false);
    },
    [currentInterview, id, tools, setInterview]
  );

  if (interviewLoadError) {
    return (
      <div
        data-app-fill
        className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Could not open this interview</h2>
          <p className="text-sm text-muted-foreground">{interviewLoadError}</p>
        </div>
        <Button onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!currentInterview || isInterviewLoading) {
    return (
      <div
        data-app-fill
        className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 text-muted-foreground"
      >
        <Loader2 className="animate-spin h-6 w-6 text-primary" />
        Loading room...
      </div>
    );
  }

  const interaction = resolveInterviewInteractionMode(currentInterview);

  if (viewMode === 'voice') {
    return (
      // The voice room is already `flex-1 min-h-0`; it only gets a definite
      // height from the fill contract on this wrapper.
      <div data-app-fill className="flex-1 min-h-0 flex flex-col">
        <VoiceInterviewRoom
          onSwitchToText={
            interaction === 'hybrid' || interaction === 'text'
              ? () => setViewMode('text')
              : undefined
          }
          onRetry={retryLastMessage}
          onEndInterview={handleEndInterview}
        />
      </div>
    );
  }

  return (
    <div
      data-app-fill
      className="flex flex-1 min-h-0 flex-col w-full max-w-7xl mx-auto bg-background border-x-0 md:border border-border overflow-hidden relative"
    >
      <SEO
        title="Interview Room - HR With AI"
        description="Live AI mock interview regarding your target role. Receive real-time hints and feedback."
      />
      {isEndingSession && <EndingSessionOverlay />}
      <InterviewErrorBanner onRetry={retryLastMessage} />
      <InterviewHeader
        interview={currentInterview}
        timer={timer}
        onOpenSettings={() => setShowSettings(true)}
        onEndSession={() => void handleEndInterview()}
        viewMode={viewMode}
        onSwitchViewMode={
          interaction === 'hybrid' || interaction === 'text'
            ? () => setViewMode((prev) => (prev === 'voice' ? 'text' : 'voice'))
            : undefined
        }
      />

      <ChatArea
        messages={currentInterview.messages}
        onRetry={retryLastMessage}
        onRegenerate={regenerateLastResponse}
        isProcessing={isProcessing}
        onOpenTool={(tool) => {
          if (tool === 'code') tools.setIsCodeOpen(true);
          if (tool === 'whiteboard') tools.setIsWhiteboardOpen(true);
        }}
      />

      <InputArea
        inputValue={inputValue}
        setInputValue={setInputValue}
        onSendMessage={handleSendMessage}
        isCodeOpen={tools.isCodeOpen}
        setIsCodeOpen={tools.setIsCodeOpen}
        contentType={resolveInterviewContentType(currentInterview)}
        isWhiteboardOpen={tools.isWhiteboardOpen}
        setIsWhiteboardOpen={tools.setIsWhiteboardOpen}
        suggestedAction={suggestedAction}
        isProcessing={isProcessing}
        hints={hints}
        setHints={setHints}
        isLoadingHints={isLoadingHints}
        onGetHints={handleGetHints}
        hintsEnabled={userSettings.hintsEnabled}
        language={currentInterview.language}
      />

      <ToolModals
        isCodeOpen={tools.isCodeOpen}
        setIsCodeOpen={tools.setIsCodeOpen}
        isWhiteboardOpen={tools.isWhiteboardOpen}
        setIsWhiteboardOpen={tools.setIsWhiteboardOpen}
        currentCode={currentInterview.code || ''}
        updateCode={updateCode}
        whiteboardData={currentInterview.whiteboard || ''}
        onWhiteboardMount={(editor: Editor) => {
          tools.setEditor(editor);
        }}
        updateWhiteboard={updateWhiteboard}
        onSubmit={(type) => tools.handleToolSubmit(type, sendMessage)}
        isHardcore={currentInterview.difficulty === 'hardcore'}
        isSubmitting={isSubmitting}
      />

      <SettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
        onSettingsChanged={setUserSettings}
      />
      <JobRecommendationModal
        isOpen={showJobRecommendationModal}
        onClose={() => setShowJobRecommendationModal(false)}
        onSelectJob={handleSelectJob}
        existingResumeId={currentInterview.resumeId}
        availableResumes={availableResumes}
        language={currentInterview.language}
        currentInterviewId={currentInterview.id}
      />
    </div>
  );
};

export default InterviewRoom;
