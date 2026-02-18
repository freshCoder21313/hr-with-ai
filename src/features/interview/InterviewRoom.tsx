import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Editor, TLShapeId } from 'tldraw';
import { db } from '@/lib/db';
import { useInterview } from '@/hooks/useInterview';

import {
  generateInterviewHints,
  InterviewHints,
  getStoredAIConfig,
} from '@/services/geminiService';
import { loadUserSettings } from '@/services/settingsService';
import { useInterviewStore } from './interviewStore';
import { UserSettings, Resume, JobRecommendation } from '@/types';
import SettingsModal from '@/components/SettingsModal';
import JobRecommendationModal from './JobRecommendationModal';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import SEO from '@/components/SEO';

// Components
import { InterviewHeader } from './components/InterviewHeader';
import { ChatArea } from './components/ChatArea';
import { InputArea } from './components/InputArea';
import { ToolModals } from './components/ToolModals';
import { VoiceInterviewRoom } from './components/VoiceInterviewRoom';

// Hooks
import { useInterviewTimer } from './hooks/useInterviewTimer';

// Helper
const svgToPngBase64 = (svg: SVGElement): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const svgStr = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const width = parseFloat(svg.getAttribute('width') || '1000');
      const height = parseFloat(svg.getAttribute('height') || '1000');
      canvas.width = width;
      canvas.height = height;
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0);
        }
        const dataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        console.error('Image loading failed', e);
        resolve('');
      };
      img.src = url;
    } catch (e) {
      console.error('SVG conversion failed', e);
      resolve('');
    }
  });
};

const InterviewRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Custom Hooks
  const {
    currentInterview,
    sendMessage,
    endSession,
    retryLastMessage,
    isLoading: isProcessing,
  } = useInterview();
  const { setInterview, updateCode, updateWhiteboard } = useInterviewStore();

  // Local State
  const [inputValue, setInputValue] = useState('');

  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    hintsEnabled: false,
  });
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [hints, setHints] = useState<InterviewHints | null>(null);
  const [isLoadingHints, setIsLoadingHints] = useState(false);
  const [showJobRecommendationModal, setShowJobRecommendationModal] = useState(false);
  const [availableResumes, setAvailableResumes] = useState<Resume[]>([]);
  const [suggestedAction, setSuggestedAction] = useState<'code' | 'draw' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const processedMessageIds = useRef<Set<number>>(new Set());

  // Refs
  const editorRef = useRef<Editor | null>(null);

  // Timer Hook
  const { timer } = useInterviewTimer(isProcessing, currentInterview?.difficulty, () =>
    handleSendMessage()
  );

  // --- Effects ---

  // Smart Action Detection & Auto-Open
  useEffect(() => {
    if (currentInterview?.messages?.length) {
      const lastMsg = currentInterview.messages[currentInterview.messages.length - 1];

      // Skip if we've already processed this message for auto-opening
      if (processedMessageIds.current.has(lastMsg.timestamp)) {
        return;
      }

      if (lastMsg.role === 'model') {
        const text = lastMsg.content;

        // 1. Explicit Tag Detection (Auto-Open)
        if (text.includes('<ACTION type="CODE"')) {
          // setIsCodeOpen(true); // Disable auto-open
          setSuggestedAction('code');
          processedMessageIds.current.add(lastMsg.timestamp);
          return;
        }

        if (text.includes('<ACTION type="DRAW"')) {
          // setIsWhiteboardOpen(true); // Disable auto-open
          setSuggestedAction('draw');
          processedMessageIds.current.add(lastMsg.timestamp);
          return;
        }

        // 2. Fallback Heuristic (Suggestion Only, No Auto-Open)
        const lower = text.toLowerCase();
        if (
          lower.includes('code') ||
          lower.includes('programming') ||
          lower.includes('function') ||
          lower.includes('implement')
        ) {
          setSuggestedAction('code');
        } else if (
          lower.includes('draw') ||
          lower.includes('diagram') ||
          lower.includes('whiteboard') ||
          lower.includes('visualize')
        ) {
          setSuggestedAction('draw');
        } else {
          setSuggestedAction(null);
        }
      }
    }
  }, [currentInterview?.messages]);

  // Auto-open tools based on Mode
  useEffect(() => {
    // Check type first, fallback to mode (legacy)
    const interviewType = currentInterview?.type || currentInterview?.mode;

    if (interviewType === 'coding') {
      setIsCodeOpen(true);
    } else if (interviewType === 'system_design') {
      setIsWhiteboardOpen(true);
    }
  }, [currentInterview?.type, currentInterview?.mode]);

  // View Mode (Text vs Voice)
  const [viewMode, setViewMode] = useState<'text' | 'voice'>('text');

  // Initialize view mode based on interview settings
  useEffect(() => {
    if (currentInterview?.mode === 'voice') {
      setViewMode('voice');
    } else if (currentInterview?.mode === 'text') {
      setViewMode('text');
    }
    // Hybrid defaults to text unless configured otherwise, or we can add logic later
  }, [currentInterview?.mode]);

  // Load Data
  useEffect(() => {
    const loadInterview = async () => {
      if (!id) return;
      if (currentInterview && currentInterview.id === parseInt(id)) return;

      const data = await db.interviews.get(parseInt(id));
      if (data) {
        setInterview(data);
      } else {
        navigate('/');
      }
    };
    loadInterview();
  }, [id, currentInterview, setInterview, navigate]);

  // Load settings on mount and restore TTS preference
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await loadUserSettings();
        setUserSettings(stored);

        setIsSettingsLoaded(true);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setIsSettingsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Reload settings when modal closes
  useEffect(() => {
    if (!showSettings && isSettingsLoaded) {
      const reloadSettings = async () => {
        try {
          const stored = await loadUserSettings();
          setUserSettings(stored);
        } catch (error) {
          console.error('Failed to reload settings:', error);
        }
      };
      reloadSettings();
    }
  }, [showSettings, isSettingsLoaded]);

  useEffect(() => {
    const loadResumes = async () => {
      try {
        const resumes = await db.resumes.toArray();
        setAvailableResumes(resumes);
      } catch (error) {
        console.error('Failed to load resumes:', error);
      }
    };
    loadResumes();
  }, []);

  // --- Handlers ---

  const handleGetHints = async () => {
    if (!currentInterview?.messages?.length) return;
    const lastQuestion = [...currentInterview.messages].reverse().find((m) => m.role === 'model');
    if (!lastQuestion) {
      alert('Wait for the interviewer to ask a question first!');
      return;
    }
    const config = getStoredAIConfig();
    if (!config.apiKey) {
      // alert('Please check your API Key settings.');
      openApiKeyModal();
      return;
    }
    setIsLoadingHints(true);
    setHints(null);
    try {
      const context = `Role: ${currentInterview.jobTitle} at ${currentInterview.company}. Persona: ${currentInterview.interviewerPersona}`;
      const result = await generateInterviewHints(lastQuestion.content, context, config);
      setHints(result);
    } catch (error) {
      console.error(error);
      alert('Failed to get hints. Please try again.');
    } finally {
      setIsLoadingHints(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentInterview) return;

    setHints(null);
    setSuggestedAction(null);

    let imageBase64: string | undefined = undefined;
    if (isWhiteboardOpen && editorRef.current) {
      try {
        const shapeIds = Array.from(editorRef.current.getCurrentPageShapeIds()) as TLShapeId[];
        if (shapeIds.length > 0) {
          const svg = await editorRef.current.getSvg(shapeIds, { background: true });
          if (svg) {
            const pngData = await svgToPngBase64(svg);
            if (pngData) imageBase64 = pngData;
          }
        }
      } catch (e) {
        console.error('Failed to capture whiteboard', e);
      }
    }

    const contentToSend = inputValue;
    setInputValue('');
    // Timer is stopped by hook effect when processing starts
    await sendMessage(contentToSend, imageBase64);
  };

  const handleEndInterview = async () => {
    if (
      window.confirm(
        'Are you sure you want to end this interview? AI will generate feedback for you.'
      )
    ) {
      setIsEndingSession(true);
      try {
        await endSession();
      } catch (error) {
        console.error('Failed to end session:', error);
        setIsEndingSession(false);
      }
    }
  };

  const handleRunCode = async () => {
    alert('This feature is coming soon! (Backend integration in progress)');
  };

  const handleToolSubmit = async (type: 'code' | 'whiteboard') => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let content = '';
      let imageBase64: string | undefined = undefined;

      if (type === 'code') {
        const code = currentInterview?.code || '';
        // TODO: Detect language dynamically if possible
        content = `Here is my solution:\n\n\`\`\`javascript\n${code}\n\`\`\``;
        setIsCodeOpen(false);
      } else if (type === 'whiteboard') {
        if (editorRef.current) {
          try {
            const shapeIds = Array.from(editorRef.current.getCurrentPageShapeIds()) as TLShapeId[];
            if (shapeIds.length > 0) {
              const svg = await editorRef.current.getSvg(shapeIds, {
                background: true,
                scale: 1, // Ensure good resolution
              });
              if (svg) {
                const pngData = await svgToPngBase64(svg);
                if (pngData) {
                  imageBase64 = pngData;
                } else {
                  console.error('Failed to convert whiteboard SVG to PNG');
                  // Optional: alert('Failed to generate image from whiteboard. Sending text only.');
                }
              }
            }
          } catch (e) {
            console.error('Failed to capture whiteboard', e);
          }
        }
        content = 'I have sketched the system design. Please review the attached diagram.';
        setIsWhiteboardOpen(false);
      }

      if (content) {
        await sendMessage(content, imageBase64);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectJob = async (job: JobRecommendation, tailoredResumeText: string) => {
    if (!currentInterview || !id) return;
    const updatedInterview = {
      ...currentInterview,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.jobDescription,
      tailoredResume: tailoredResumeText,
    };
    await db.interviews.put(updatedInterview, parseInt(id));
    setInterview(updatedInterview);
    setShowJobRecommendationModal(false);
  };

  if (!currentInterview)
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        Loading room...
      </div>
    );

  // Conditional Render for Voice Room
  if (viewMode === 'voice') {
    return (
      <VoiceInterviewRoom
        onSwitchToText={currentInterview.mode === 'hybrid' ? () => setViewMode('text') : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] md:h-[calc(100vh-80px)] w-full md:max-w-7xl mx-auto bg-background rounded-none md:rounded-xl shadow-none md:shadow-lg border-x-0 md:border border-border overflow-hidden md:my-4 relative">
      <SEO
        title="Interview Room - HR With AI"
        description="Live AI mock interview regarding your target role. Receive real-time hints and feedback."
      />
      {/* Loading Overlay */}
      {isEndingSession && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all animate-in fade-in duration-300">
          <div className="bg-card p-6 md:p-8 rounded-2xl shadow-2xl border border-border flex flex-col items-center max-w-md text-center mx-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Analyzing Interview</h3>
            <p className="text-muted-foreground">Generating detailed feedback...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <InterviewHeader
        interview={currentInterview}
        timer={timer}
        onOpenSettings={() => setShowSettings(true)}
        onEndSession={handleEndInterview}
        viewMode={viewMode}
        onSwitchViewMode={
          currentInterview.mode === 'hybrid' || currentInterview.mode === 'text'
            ? () => setViewMode((prev) => (prev === 'voice' ? 'text' : 'voice'))
            : undefined
        }
      />

      {/* Main Chat Area */}
      <ChatArea
        messages={currentInterview.messages}
        onRetry={retryLastMessage}
        isProcessing={isProcessing}
        onOpenTool={(tool) => {
          if (tool === 'code') setIsCodeOpen(true);
          if (tool === 'whiteboard') setIsWhiteboardOpen(true);
        }}
      />

      {/* Input Area */}
      <InputArea
        inputValue={inputValue}
        setInputValue={setInputValue}
        onSendMessage={handleSendMessage}
        isCodeOpen={isCodeOpen}
        setIsCodeOpen={setIsCodeOpen}
        isWhiteboardOpen={isWhiteboardOpen}
        setIsWhiteboardOpen={setIsWhiteboardOpen}
        suggestedAction={suggestedAction}
        isProcessing={isProcessing}
        hints={hints}
        setHints={setHints}
        isLoadingHints={isLoadingHints}
        onGetHints={handleGetHints}
        hintsEnabled={userSettings.hintsEnabled}
      />

      {/* Tool Modals */}
      <ToolModals
        isCodeOpen={isCodeOpen}
        setIsCodeOpen={setIsCodeOpen}
        isWhiteboardOpen={isWhiteboardOpen}
        setIsWhiteboardOpen={setIsWhiteboardOpen}
        currentCode={currentInterview.code || ''}
        updateCode={updateCode}
        whiteboardData={currentInterview.whiteboard}
        onWhiteboardMount={(editor) => {
          editorRef.current = editor;
        }}
        updateWhiteboard={updateWhiteboard}
        handleRunCode={handleRunCode}
        onSubmit={handleToolSubmit}
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
