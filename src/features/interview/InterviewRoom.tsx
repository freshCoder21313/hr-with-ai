import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StopCircle, User, Bot, Mic, MicOff, Volume2, VolumeX, MessageSquare, Code2, PenTool, Image as ImageIcon, Send } from 'lucide-react';
import { db } from '@/lib/db';
import { useInterview } from '@/hooks/useInterview';
import { useVoice } from '@/hooks/useVoice';
import { callN8nWebhook } from '@/services/n8nService';
import CodeEditor from './CodeEditor';
import Whiteboard from './Whiteboard';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useInterviewStore } from './interviewStore';
import { Message } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Helper to convert SVG to PNG Base64 (Same as before)
const svgToPngBase64 = (svg: SVGElement): Promise<string> => {
  return new Promise((resolve, reject) => {
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
            console.error("Image loading failed", e);
            resolve("");
        };
        img.src = url;
    } catch (e) {
        console.error("SVG conversion failed", e);
        resolve("");
    }
  });
};

const InterviewRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    currentInterview, 
    sendMessage, 
    endSession,
    isLoading: isProcessing
  } = useInterview();
  const { setInterview, updateCode, updateWhiteboard, addMessage } = useInterviewStore();

  const [inputValue, setInputValue] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'code' | 'whiteboard'>('chat');
  const [isRunningCode, setIsRunningCode] = useState(false);
  
  const editorRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    speak, 
    cancelSpeech,
    isSpeaking 
  } = useVoice({ language: currentInterview?.language || 'en-US' });

  useEffect(() => {
    if (isListening) {
      setInputValue(transcript);
    }
  }, [transcript, isListening]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentInterview, setInterview, navigate]);

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [currentInterview?.messages, activeTab]);

  const handleSendMessage = async () => {
    if ((!inputValue.trim()) || !currentInterview) return;

    if (isListening) {
      stopListening();
      resetTranscript();
    }
    cancelSpeech();

    let imageBase64: string | undefined = undefined;
    if (activeTab === 'whiteboard' && editorRef.current) {
        try {
            const shapeIds = Array.from(editorRef.current.getCurrentPageShapeIds()) as any[];
            if (shapeIds.length > 0) {
                const svg = await editorRef.current.getSvg(shapeIds, { background: true });
                if (svg) {
                    const pngData = await svgToPngBase64(svg);
                    if (pngData) imageBase64 = pngData;
                }
            }
        } catch (e) {
            console.error("Failed to capture whiteboard", e);
        }
    }

    const contentToSend = inputValue;
    setInputValue(''); 
    await sendMessage(contentToSend, imageBase64);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEndInterview = async () => {
    cancelSpeech();
    await endSession();
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
    if (!currentInterview?.code?.trim() || !id) return;
    const n8nUrl = localStorage.getItem('n8n_webhook_url');
    if (!n8nUrl) {
        alert("Please configure n8n Webhook URL in settings to run code.");
        return;
    }
    setIsRunningCode(true);
    try {
        const result = await callN8nWebhook({ 
            action: 'run_code',
            code: currentInterview.code,
            language: 'javascript', 
            interviewId: id,
            context: currentInterview
        });
        const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        const resultMsg: Message = {
            role: 'model',
            content: `**🏁 Code Execution Result:**\n\`\`\`\n${resultText}\n\`\`\``,
            timestamp: Date.now()
        };
        addMessage(resultMsg);
        setActiveTab('chat');
    } catch (e: any) {
        console.error(e);
        alert("Failed to run code: " + e.message);
    } finally {
        setIsRunningCode(false);
    }
  };

  if (!currentInterview) return <div className="h-screen flex items-center justify-center text-slate-500">Loading room...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-7xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden my-4">
      {/* Header */}
      <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center h-16">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-800 text-lg">{currentInterview.company}</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">
                {currentInterview.language === 'vi-VN' ? 'VI' : 'EN'}
            </span>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{currentInterview.jobTitle}</p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-slate-200/80 rounded-lg p-1 gap-1">
            <Button
                variant={activeTab === 'chat' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('chat')}
                className={cn("h-8 px-3 transition-all", activeTab === 'chat' ? "bg-white text-blue-600 shadow-sm hover:bg-white hover:text-blue-700" : "hover:bg-slate-300/50 text-slate-600")}
            >
                <MessageSquare size={15} className="mr-2" />
                Chat
            </Button>
            <Button
                variant={activeTab === 'code' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('code')}
                className={cn("h-8 px-3 transition-all", activeTab === 'code' ? "bg-white text-blue-600 shadow-sm hover:bg-white hover:text-blue-700" : "hover:bg-slate-300/50 text-slate-600")}
            >
                <Code2 size={15} className="mr-2" />
                Code
            </Button>
            <Button
                variant={activeTab === 'whiteboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('whiteboard')}
                className={cn("h-8 px-3 transition-all", activeTab === 'whiteboard' ? "bg-white text-blue-600 shadow-sm hover:bg-white hover:text-blue-700" : "hover:bg-slate-300/50 text-slate-600")}
            >
                <PenTool size={15} className="mr-2" />
                Design
            </Button>
        </div>

        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                    if (isSpeaking) cancelSpeech();
                    setTtsEnabled(!ttsEnabled);
                }}
                className={cn("h-9 w-9", ttsEnabled ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-slate-400 hover:bg-slate-100")}
                title="Toggle Text-to-Speech"
            >
                {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </Button>
            <Button
                variant="destructive"
                size="sm"
                onClick={handleEndInterview}
                className="gap-2"
            >
                <StopCircle className="w-4 h-4" />
                End Session
            </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Chat Tab */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
            {currentInterview.messages.map((msg, idx) => (
            <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
                <div className={`flex max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm border ${msg.role === 'user' ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-white text-slate-600 border-slate-200'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="flex flex-col gap-2 w-full">
                    {msg.image && (
                        <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm max-w-[300px]">
                            <img src={msg.image} alt="Whiteboard snapshot" className="w-full h-auto bg-white" />
                        </div>
                    )}
                    <div
                        className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
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
                isRunning={isRunningCode}
             />
        </div>

        {/* Whiteboard Tab */}
        <div className={`flex-1 p-0 bg-white ${activeTab === 'whiteboard' ? 'block' : 'hidden'}`}>
            <Whiteboard 
                initialData={currentInterview.whiteboard}
                onMount={(editor) => { editorRef.current = editor; }}
                onChange={(data) => updateWhiteboard(data)}
            />
        </div>
      </div>

      {/* Input Area (Always visible) */}
      <div className="p-4 bg-white border-t border-slate-200 z-10">
        <div className="relative flex items-end gap-2 max-w-5xl mx-auto">
          <div className="relative flex-1">
            <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isListening ? "Listening..." : "Type your answer here..."}
                className={cn(
                    "w-full min-h-[50px] max-h-[150px] resize-none pr-12 py-3 shadow-sm",
                    isListening ? "border-red-400 ring-2 ring-red-100 bg-red-50 placeholder-red-400 focus-visible:ring-red-400" : ""
                )}
                rows={1}
            />
            <Button
                variant={isListening ? "destructive" : "ghost"}
                size="icon"
                onClick={toggleVoice}
                className={cn(
                    "absolute right-2 top-1.5 h-9 w-9 transition-all",
                    isListening ? "animate-pulse" : "text-slate-400 hover:text-slate-600"
                )}
                title="Toggle Voice Input"
            >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </Button>
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && !isListening)}
            className="h-[50px] w-[50px] rounded-xl shrink-0"
            size="icon"
          >
            <Send size={20} />
          </Button>
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-2 select-none">
            {activeTab === 'code' && <span className="text-blue-500 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-100">[Code Mode] AI sees your code.</span>}
            {activeTab === 'whiteboard' && <span className="text-emerald-500 font-medium flex items-center bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"><ImageIcon size={12} className="mr-1"/> [Design Mode] AI sees your drawing.</span>}
            <span className="opacity-70">{isListening ? 'Speak now...' : 'Press Enter to send'}</span>
        </p>
      </div>
    </div>
  );
};

export default InterviewRoom;
