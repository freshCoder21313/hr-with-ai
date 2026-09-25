import React, { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { notificationService } from '@/services/core/notificationService';
import { useParams } from 'react-router-dom';
import type { Editor, TLShapeId } from 'tldraw';
import { useInterview } from '@/hooks/useInterview';
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

import { InterviewHeader } from './components/InterviewHeader';
import { ChatArea } from './components/ChatArea';
import { InputArea } from './components/InputArea';
import { ToolModals } from './components/ToolModals';
import { VoiceInterviewRoom } from './components/VoiceInterviewRoom';
import { EndingSessionOverlay } from './components/EndingSessionOverlay';

import { useInterviewTimer } from './hooks/useInterviewTimer';
import { useToolHandlers } from './hooks/useToolHandlers';
import { useSuggestedAction } from './hooks/useSuggestedAction';
import { useInterviewHints } from './hooks/useInterviewHints';
import { useInterviewRoomBootstrap } from './hooks/useInterviewRoomBootstrap';

const InterviewRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    currentInterview,
    sendMessage,
    endSession,
    retryLastMessage,
    regenerateLastResponse,
    isLoading: isProcessing,
  } = useInterview();
  const { setInterview, updateCode, updateWhiteboard } = useInterviewStore();
  const { isLoading: isInterviewLoading } = useInterviewLoader();

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
  const { suggestedAction, setSuggestedAction } = useSuggestedAction(currentInterview?.messages);
  const { hints, setHints, isLoadingHints, handleGetHints } = useInterviewHints(currentInterview);

  useEffect(() => {
    if (autoOpenCode) tools.setIsCodeOpen(true);
  }, [autoOpenCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoOpenWhiteboard) tools.setIsWhiteboardOpen(true);
  }, [autoOpenWhiteboard]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleEndInterview = useCallback(async () => {
    const confirmed = await notificationService.confirm({
      title: 'End Interview',
      message: 'Are you sure you want to end this interview? AI will generate feedback for you.',
    });
    if (!confirmed) return;
    setIsEndingSession(true);
    try {
      await endSession();
    } catch (error) {
      notificationService.error('Failed to end session', error);
      setIsEndingSession(false);
    }
  }, [endSession]);

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

  if (!currentInterview || isInterviewLoading) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin h-6 w-6 text-primary" />
        Loading room...
      </div>
    );
  }

  const interaction = resolveInterviewInteractionMode(currentInterview);

  if (viewMode === 'voice') {
    return (
      <VoiceInterviewRoom
        onSwitchToText={
          interaction === 'hybrid' || interaction === 'text' ? () => setViewMode('text') : undefined
        }
        onEndInterview={handleEndInterview}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] md:h-[calc(100vh-80px)] w-full md:max-w-7xl mx-auto bg-background rounded-none md:rounded-xl shadow-none md:shadow-lg border-x-0 md:border border-border overflow-hidden md:my-4 relative">
      <SEO
        title="Interview Room - HR With AI"
        description="Live AI mock interview regarding your target role. Receive real-time hints and feedback."
      />
      {isEndingSession && <EndingSessionOverlay />}

      <InterviewHeader
        interview={currentInterview}
        timer={timer}
        onOpenSettings={() => setShowSettings(true)}
        onEndSession={handleEndInterview}
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
        handleRunCode={tools.handleRunCode}
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
        currentInterviewId={currentInterview.id}
      />
    </div>
  );
};

export default InterviewRoom;
