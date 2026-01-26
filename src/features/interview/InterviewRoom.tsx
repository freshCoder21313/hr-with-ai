import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/db';
import { useInterview } from '@/hooks/useInterview';
import { useVoice } from '@/hooks/useVoice';
import {
  generateInterviewHints,
  InterviewHints,
  getStoredAIConfig,
} from '@/services/geminiService';
import { useInterviewStore } from './interviewStore';
import { UserSettings, Resume, JobRecommendation } from '@/types';
import SettingsModal from '@/components/SettingsModal';
import JobRecommendationModal from './JobRecommendationModal';

// Components
import { InterviewHeader } from './components/InterviewHeader';
import { ChatArea } from './components/ChatArea';
import { InputArea } from './components/InputArea';
import { ToolModals } from './components/ToolModals';

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
  const { currentInterview, sendMessage, endSession, isLoading: isProcessing } = useInterview();
  const { setInterview, updateCode, updateWhiteboard } = useInterviewStore();

  // Local State
  const [inputValue, setInputValue] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    voiceEnabled: true,
    hintsEnabled: false,
  });
  const [hints, setHints] = useState<InterviewHints | null>(null);
  const [isLoadingHints, setIsLoadingHints] = useState(false);
  const [showJobRecommendationModal, setShowJobRecommendationModal] = useState(false);
  const [availableResumes, setAvailableResumes] = useState<Resume[]>([]);
  const [suggestedAction, setSuggestedAction] = useState<'code' | 'draw' | null>(null);

  // Refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const lastSpokenTimestampRef = useRef<number>(0);

  // Voice Hook
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    speak,
    cancelSpeech,
    isSpeaking,
    isSupported,
  } = useVoice({ language: currentInterview?.language || 'en-US' });

  // Timer Hook
  const { timer } = useInterviewTimer(isProcessing, currentInterview?.difficulty, () =>
    handleSendMessage()
  );

  // --- Effects ---

  useEffect(() => {
    if (isListening) {
      setInputValue(transcript);
    }
  }, [transcript, isListening]);

  // Smart Action Detection
  useEffect(() => {
    if (currentInterview?.messages?.length) {
      const lastMsg = currentInterview.messages[currentInterview.messages.length - 1];
      if (lastMsg.role === 'model') {
        const text = lastMsg.content.toLowerCase();
        if (
          text.includes('code') ||
          text.includes('programming') ||
          text.includes('function') ||
          text.includes('implement')
        ) {
          setSuggestedAction('code');
        } else if (
          text.includes('draw') ||
          text.includes('diagram') ||
          text.includes('whiteboard') ||
          text.includes('visualize')
        ) {
          setSuggestedAction('draw');
        } else {
          setSuggestedAction(null);
        }
      }
    }
  }, [currentInterview?.messages]);

  // TTS Trigger
  useEffect(() => {
    if (
      !isProcessing &&
      ttsEnabled &&
      userSettings.voiceEnabled &&
      currentInterview?.messages?.length
    ) {
      const lastMsg = currentInterview.messages[currentInterview.messages.length - 1];
      if (lastMsg.role === 'model' && lastMsg.timestamp > lastSpokenTimestampRef.current) {
        lastSpokenTimestampRef.current = lastMsg.timestamp;
        const cleanText = lastMsg.content.replace(/```[\s\S]*?```/g, 'Code block omitted.').trim();
        speak(cleanText);
      }
    }
  }, [isProcessing, ttsEnabled, userSettings.voiceEnabled, currentInterview?.messages, speak]);

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

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await db.userSettings.orderBy('id').first();
        if (stored) {
          setUserSettings(stored);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, [showSettings]);

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
      alert('Please check your API Key settings.');
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
    if (isListening) {
      stopListening();
      resetTranscript();
    }
    cancelSpeech();

    let imageBase64: string | undefined = undefined;
    if (isWhiteboardOpen && editorRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const shapeIds = Array.from(editorRef.current.getCurrentPageShapeIds()) as any[];
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
      cancelSpeech();
      setIsEndingSession(true);
      try {
        await endSession();
      } catch (error) {
        console.error('Failed to end session:', error);
        setIsEndingSession(false);
      }
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      cancelSpeech();
      startListening();
    }
  };

  const handleRunCode = async () => {
    alert('This feature is coming soon! (Backend integration in progress)');
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

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] md:h-[calc(100vh-80px)] w-full md:max-w-7xl mx-auto bg-white rounded-none md:rounded-xl shadow-none md:shadow-lg border-x-0 md:border border-slate-200 overflow-hidden md:my-4 relative">
      {/* Loading Overlay */}
      {isEndingSession && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm transition-all animate-in fade-in duration-300">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center max-w-md text-center mx-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Analyzing Interview</h3>
            <p className="text-slate-500">Generating detailed feedback...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <InterviewHeader
        interview={currentInterview}
        timer={timer}
        ttsEnabled={ttsEnabled}
        onToggleTts={() => {
          if (isSpeaking) cancelSpeech();
          setTtsEnabled(!ttsEnabled);
        }}
        onOpenSettings={() => setShowSettings(true)}
        onEndSession={handleEndInterview}
      />

      {/* Main Chat Area */}
      <ChatArea messages={currentInterview.messages} />

      {/* Input Area */}
      <InputArea
        inputValue={inputValue}
        setInputValue={setInputValue}
        onSendMessage={handleSendMessage}
        isListening={isListening}
        isSupported={isSupported}
        onToggleVoice={toggleVoice}
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
        isHardcore={currentInterview.difficulty === 'hardcore'}
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
