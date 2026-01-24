import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  StopCircle,
  User,
  Bot,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Code2,
  PenTool,
  Image as ImageIcon,
  Send,
  Loader2,
  Lightbulb,
  Settings as SettingsIcon,
} from 'lucide-react';
import { db } from '@/lib/db';
import { useInterview } from '@/hooks/useInterview';
import { useVoice } from '@/hooks/useVoice';
import {
  generateInterviewHints,
  InterviewHints,
  getStoredAIConfig,
} from '@/services/geminiService';
import CodeEditor from './CodeEditor';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useInterviewStore } from './interviewStore';
import { UserSettings, Resume, JobRecommendation } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import SettingsModal from '@/components/SettingsModal';
import InterviewHintView from './InterviewHintView';
import JobRecommendationModal from './JobRecommendationModal';

// Lazy load Whiteboard to save resources if not used
const Whiteboard = React.lazy(() => import('./Whiteboard'));

// Helper to convert SVG to PNG Base64 (Same as before)
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
  const { currentInterview, sendMessage, endSession, isLoading: isProcessing } = useInterview();
  const { setInterview, updateCode, updateWhiteboard } = useInterviewStore();

  const [inputValue, setInputValue] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'code' | 'whiteboard'>('chat');
  const [, setIsRunningCode] = useState(false);
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

  // Hardcore Mode Timer
  const [timer, setTimer] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSpokenTimestampRef = useRef<number>(0);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    speak,
    cancelSpeech,
    isSpeaking,
    isSupported, // Destructure isSupported
  } = useVoice({ language: currentInterview?.language || 'en-US' });

  useEffect(() => {
    // Timer Logic for Hardcore Mode
    let interval: NodeJS.Timeout;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && isTimerActive) {
      // Time is up!
      handleSendMessage(); // Auto-send what is currently typed
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerActive, timer]);

  useEffect(() => {
    // Reset/Start Timer when AI finishes processing (User's turn starts)
    if (!isProcessing && currentInterview?.difficulty === 'hardcore') {
      setTimer(60); // 60 Seconds limit
      setIsTimerActive(true);
    } else if (isProcessing) {
      setIsTimerActive(false); // Stop timer while AI is thinking
    }
  }, [isProcessing, currentInterview?.difficulty]);

  useEffect(() => {
    if (isListening) {
      setInputValue(transcript);
    }
  }, [transcript, isListening]);

  // TTS Trigger
  useEffect(() => {
    if (
      !isProcessing &&
      ttsEnabled &&
      userSettings.voiceEnabled &&
      currentInterview?.messages?.length
    ) {
      const lastMsg = currentInterview.messages[currentInterview.messages.length - 1];
      // Speak only if it's a new message from the model
      if (lastMsg.role === 'model' && lastMsg.timestamp > lastSpokenTimestampRef.current) {
        lastSpokenTimestampRef.current = lastMsg.timestamp;
        // Strip markdown symbols for cleaner speech if needed, but basic TTS usually handles them okay.
        // Let's strip code blocks to avoid reading raw code syntax excessively.
        const cleanText = lastMsg.content.replace(/```[\s\S]*?```/g, 'Code block omitted.').trim();
        speak(cleanText);
      }
    }
  }, [isProcessing, ttsEnabled, userSettings.voiceEnabled, currentInterview?.messages, speak]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [currentInterview?.messages, activeTab]);

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
  }, [showSettings]); // Reload when settings modal closes/changes

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

  const handleGetHints = async () => {
    if (!currentInterview?.messages?.length) return;

    // Find the last question from the interviewer
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

    setHints(null); // Clear hints on new message
    if (isListening) {
      stopListening();
      resetTranscript();
    }
    cancelSpeech();

    let imageBase64: string | undefined = undefined;
    if (activeTab === 'whiteboard' && editorRef.current) {
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
    setIsTimerActive(false); // Stop timer on send
    await sendMessage(contentToSend, imageBase64);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
    // Feature temporarily disabled
    alert('This feature is coming soon! (Backend integration in progress)');
    return;
  };

  const handleSelectJob = async (job: JobRecommendation, tailoredResumeText: string) => {
    if (!currentInterview || !id) return;

    // Update the current interview with job details
    const updatedInterview = {
      ...currentInterview,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.jobDescription,
      tailoredResume: tailoredResumeText,
      // language and interviewerPersona remain unchanged
    };

    // Save the updated interview
    await db.interviews.put(updatedInterview, parseInt(id));
    setInterview(updatedInterview);

    // Close the modal
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
      {/* Loading Overlay for Session Ending */}
      {isEndingSession && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm transition-all animate-in fade-in duration-300">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center max-w-md text-center mx-4">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-25"></div>
              <div className="relative bg-blue-50 p-4 rounded-full border border-blue-100">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Analyzing Interview</h3>
            <p className="text-slate-500">
              Please wait a moment while the AI reviewer analyzes your performance and generates
              detailed feedback...
            </p>
            <div className="mt-8 flex gap-2 w-full">
              <div className="h-1.5 flex-1 bg-blue-600 rounded-full animate-pulse"></div>
              <div className="h-1.5 flex-1 bg-blue-600 rounded-full animate-pulse delay-75"></div>
              <div className="h-1.5 flex-1 bg-blue-600 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-3 md:px-6 py-2 md:py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center h-14 md:h-16 shrink-0">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-800 text-sm md:text-lg truncate max-w-[80px] sm:max-w-[120px] md:max-w-[200px]">
              {currentInterview.company}
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300 shrink-0">
              {currentInterview.language === 'vi-VN' ? 'VI' : 'EN'}
            </span>
            {currentInterview.difficulty === 'hardcore' && (
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold transition-all',
                  timer <= 10
                    ? 'bg-red-100 text-red-600 border-red-200 animate-pulse'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                )}
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    timer <= 10 ? 'bg-red-500' : 'bg-slate-400'
                  )}
                ></div>
                {timer}s
              </div>
            )}
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wide font-medium truncate max-w-[100px] sm:max-w-[140px] md:max-w-[200px]">
            {currentInterview.jobTitle}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/80 rounded-lg p-0.5 md:p-1 gap-0.5 md:gap-1 shrink-0">
          <Button
            variant={activeTab === 'chat' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('chat')}
            className={cn(
              'h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm transition-all',
              activeTab === 'chat'
                ? 'bg-white text-blue-600 shadow-sm hover:bg-white hover:text-blue-700'
                : 'hover:bg-slate-300/50 text-slate-600'
            )}
          >
            <MessageSquare size={14} className="md:mr-2" />
            <span className="hidden md:inline">Chat</span>
          </Button>
          <Button
            variant={activeTab === 'code' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('code')}
            className={cn(
              'h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm transition-all',
              activeTab === 'code'
                ? 'bg-white text-blue-600 shadow-sm hover:bg-white hover:text-blue-700'
                : 'hover:bg-slate-300/50 text-slate-600'
            )}
          >
            <Code2 size={14} className="md:mr-2" />
            <span className="hidden md:inline">Code</span>
          </Button>
          <Button
            variant={activeTab === 'whiteboard' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('whiteboard')}
            className={cn(
              'h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm transition-all',
              activeTab === 'whiteboard'
                ? 'bg-white text-blue-600 shadow-sm hover:bg-white hover:text-blue-700'
                : 'hover:bg-slate-300/50 text-slate-600'
            )}
          >
            <PenTool size={14} className="md:mr-2" />
            <span className="hidden md:inline">Design</span>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="h-8 w-8 md:h-9 md:w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            title="Settings"
          >
            <SettingsIcon size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isSpeaking) cancelSpeech();
              setTtsEnabled(!ttsEnabled);
            }}
            className={cn(
              'h-8 w-8 md:h-9 md:w-9',
              ttsEnabled
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                : 'text-slate-400 hover:bg-slate-100'
            )}
            title="Toggle Text-to-Speech"
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEndInterview}
            className="gap-2 h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm"
          >
            <StopCircle className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden md:inline">End Session</span>
            <span className="md:hidden">End</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Chat Tab */}
        <div
          className={`flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 bg-slate-50/50 ${activeTab === 'chat' ? 'block' : 'hidden'}`}
        >
          {currentInterview.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex max-w-[95%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 md:gap-3`}
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-sm border ${msg.role === 'user' ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className="flex flex-col gap-2 w-full">
                  {msg.image && (
                    <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm max-w-[200px] md:max-w-[300px]">
                      <img
                        src={msg.image}
                        alt="Whiteboard snapshot"
                        className="w-full h-auto bg-white"
                      />
                    </div>
                  )}
                  <div
                    className={`p-3 md:p-4 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.role === 'model' ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Code Tab */}
        <div className={`flex-1 p-0 bg-[#1e1e1e] ${activeTab === 'code' ? 'block' : 'hidden'}`}>
          <CodeEditor
            code={currentInterview.code || ''}
            onChange={(val) => {
              if (val !== undefined) updateCode(val);
            }}
            onRun={handleRunCode}
            isRunning={false}
            isHardcore={currentInterview.difficulty === 'hardcore'}
          />
        </div>

        {/* Whiteboard Tab */}
        <div className={`flex-1 p-0 bg-white ${activeTab === 'whiteboard' ? 'block' : 'hidden'}`}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-slate-400">
                Loading Whiteboard...
              </div>
            }
          >
            <Whiteboard
              initialData={currentInterview.whiteboard}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              onChange={(data) => updateWhiteboard(data)}
            />
          </Suspense>
        </div>
      </div>

      {/* Input Area (Always visible) */}
      <div className="p-2 md:p-4 bg-white border-t border-slate-200 z-10 shrink-0 safe-area-bottom">
        {/* Hints View */}
        {hints && (
          <div className="max-w-5xl mx-auto mb-2">
            <InterviewHintView hints={hints} onClose={() => setHints(null)} />
          </div>
        )}

        <div className="relative flex items-end gap-2 max-w-5xl mx-auto">
          {/* Hints Button */}
          {userSettings.hintsEnabled && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleGetHints}
              disabled={isLoadingHints}
              className={cn(
                'h-[44px] w-[44px] md:h-[50px] md:w-[50px] rounded-xl shrink-0 border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-600',
                isLoadingHints ? 'animate-pulse' : ''
              )}
              title="Get AI Hints"
            >
              {isLoadingHints ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Lightbulb size={20} />
              )}
            </Button>
          )}

          <div className="relative flex-1">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isListening ? 'Listening...' : 'Type your answer...'}
              className={cn(
                'w-full min-h-[44px] max-h-[120px] resize-none pr-10 md:pr-12 py-2.5 md:py-3 shadow-sm text-sm md:text-base',
                isListening
                  ? 'border-red-400 ring-2 ring-red-100 bg-red-50 placeholder-red-400 focus-visible:ring-red-400'
                  : ''
              )}
              rows={1}
            />
            <Button
              variant={isListening ? 'destructive' : 'ghost'}
              size="icon"
              onClick={toggleVoice}
              disabled={!isSupported}
              className={cn(
                'absolute right-1 md:right-2 top-1 md:top-1.5 h-8 w-8 md:h-9 md:w-9 transition-all',
                isListening ? 'animate-pulse' : 'text-slate-400 hover:text-slate-600',
                !isSupported && 'opacity-50 cursor-not-allowed'
              )}
              title={isSupported ? "Toggle Voice Input" : "Voice Input not supported in this browser"}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </Button>
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() && !isListening}
            className="h-[44px] w-[44px] md:h-[50px] md:w-[50px] rounded-xl shrink-0"
            size="icon"
          >
            <Send size={18} />
          </Button>
        </div>
        <p className="text-center text-[10px] md:text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-2 select-none h-4">
          {activeTab === 'code' && (
            <span className="text-blue-500 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-100 hidden md:inline">
              [Code Mode] AI sees your code.
            </span>
          )}
          {activeTab === 'whiteboard' && (
            <span className="text-emerald-500 font-medium flex items-center bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 hidden md:inline">
              <ImageIcon size={12} className="mr-1" /> [Design Mode] AI sees your drawing.
            </span>
          )}
          <span className="opacity-70 hidden md:inline">
            {isListening ? 'Speak now...' : 'Press Enter to send'}
          </span>
        </p>
      </div>
      <SettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
        onSettingsChanged={setUserSettings}
      />
      <JobRecommendationModal
        isOpen={showJobRecommendationModal}
        onClose={() => setShowJobRecommendationModal(false)}
        onSelectJob={handleSelectJob}
        existingResumeId={currentInterview.resumeId} // Pass current resume ID if available
        availableResumes={availableResumes}
        currentInterviewId={currentInterview.id}
      />
    </div>
  );
};

export default InterviewRoom;
