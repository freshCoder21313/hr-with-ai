import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, StopCircle, User, Bot, Mic, MicOff, Volume2, VolumeX, MessageSquare, Code2, PenTool, Image as ImageIcon } from 'lucide-react';
import { db } from '../../lib/db';
import { Interview, Message, InterviewStatus } from '../../types';
import { startInterviewSession, streamInterviewMessage } from '../../services/geminiService';
import { useVoice } from '../../hooks/useVoice';
import CodeEditor from './CodeEditor';
import Whiteboard from './Whiteboard';

// Helper to convert SVG to PNG Base64
const svgToPngBase64 = (svg: SVGElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
        const svgStr = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Get dimensions
        const width = parseFloat(svg.getAttribute('width') || '1000');
        const height = parseFloat(svg.getAttribute('height') || '1000');
        
        canvas.width = width;
        canvas.height = height;

        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            if (ctx) {
                // Fill white background for non-transparent result
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
  const [interview, setInterview] = useState<Interview | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'code' | 'whiteboard'>('chat');
  const [code, setCode] = useState<string>('// Type your solution here\nfunction solution() {\n  \n}');
  const [whiteboardData, setWhiteboardData] = useState<string>('');
  
  // Tldraw Editor instance ref to capture snapshots
  const editorRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize voice hook with default language, will update when interview loads
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    speak, 
    cancelSpeech,
    isSpeaking 
  } = useVoice({ language: interview?.language || 'en-US' });

  // Update input value when voice transcript changes
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
      const data = await db.interviews.get(parseInt(id));
      if (data) {
        setInterview(data);
        if (data.code) {
          setCode(data.code);
        }
        if (data.whiteboard) {
          setWhiteboardData(data.whiteboard);
        }
        // If new interview, start session
        if (data.messages.length === 0) {
          setIsTyping(true);
          const initialGreeting = await startInterviewSession(data);
          const newMessage: Message = {
            role: 'model',
            content: initialGreeting,
            timestamp: Date.now()
          };
          const updatedMessages = [newMessage];
          await db.interviews.update(parseInt(id), { 
            messages: updatedMessages,
            status: InterviewStatus.IN_PROGRESS 
          });
          setInterview({ ...data, messages: updatedMessages, status: InterviewStatus.IN_PROGRESS });
          setIsTyping(false);
          
          if (ttsEnabled) {
            speak(initialGreeting);
          }
        }
      } else {
        navigate('/');
      }
    };
    loadInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [interview?.messages, isTyping, inputValue, activeTab]);

  const handleSendMessage = async () => {
    if ((!inputValue.trim()) || !interview || !id || isTyping) return;

    // Stop listening if sending
    if (isListening) {
      stopListening();
      resetTranscript();
    }
    
    // Stop any current speech
    cancelSpeech();

    // CAPTURE IMAGE IF IN WHITEBOARD MODE
    let imageBase64: string | undefined = undefined;
    if (activeTab === 'whiteboard' && editorRef.current) {
        try {
            // Get all shapes ids
            const shapeIds = Array.from(editorRef.current.getCurrentPageShapeIds()) as any[];
            if (shapeIds.length > 0) {
                // Use getSvg and manual rasterization instead of exportToBlob
                const svg = await editorRef.current.getSvg(shapeIds, { background: true });
                if (svg) {
                    const pngData = await svgToPngBase64(svg);
                    if (pngData) {
                        imageBase64 = pngData;
                    }
                }
            }
        } catch (e) {
            console.error("Failed to capture whiteboard", e);
        }
    }

    const userMsg: Message = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
      image: imageBase64 // Attach image if captured
    };

    // Optimistic update
    const tempMessages = [...interview.messages, userMsg];
    setInterview({ ...interview, messages: tempMessages });
    setInputValue('');
    setIsTyping(true);

    // Persist user message, current code, and whiteboard state
    await db.interviews.update(parseInt(id), { messages: tempMessages, code: code, whiteboard: whiteboardData });

    // Prepare for streaming response
    let accumulatedText = '';
    
    try {
      // Pass the code and image context to the AI
      const stream = streamInterviewMessage(
          tempMessages, 
          userMsg.content, 
          interview, 
          code, 
          imageBase64
      );
      
      for await (const chunk of stream) {
        accumulatedText += chunk;
        
        // Update local state for real-time effect
        setInterview(prev => {
            if (!prev) return null;
            const lastMsg = prev.messages[prev.messages.length - 1];
            if (lastMsg.role === 'model' && lastMsg.timestamp > userMsg.timestamp) {
                // Update existing
                const updatedMsgs = [...prev.messages];
                updatedMsgs[updatedMsgs.length - 1] = {
                    ...lastMsg,
                    content: accumulatedText
                };
                return { ...prev, messages: updatedMsgs };
            } else {
                // Append new model message
                return {
                    ...prev,
                    messages: [
                        ...prev.messages,
                        { role: 'model', content: accumulatedText, timestamp: Date.now() }
                    ]
                };
            }
        });
      }

      // Stream finished, save to DB
      const finalMsg: Message = {
          role: 'model',
          content: accumulatedText,
          timestamp: Date.now()
      };
      
      const finalMessages = [...tempMessages, finalMsg];
      await db.interviews.update(parseInt(id), { messages: finalMessages });
      
      setIsTyping(false);

      if (ttsEnabled) {
        speak(accumulatedText);
      }

    } catch (error) {
      console.error("Stream error", error);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEndInterview = async () => {
    if (!id) return;
    cancelSpeech();
    // Save state one last time
    await db.interviews.update(parseInt(id), { 
        status: InterviewStatus.COMPLETED, 
        code: code,
        whiteboard: whiteboardData
    });
    navigate(`/feedback/${id}`);
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      cancelSpeech();
      startListening();
    }
  };

  if (!interview) return <div className="p-8 text-center">Loading room...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-7xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-800">{interview.company}</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                {interview.language === 'vi-VN' ? 'VI' : 'EN'}
            </span>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">{interview.jobTitle}</p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-slate-200 rounded-lg p-1">
            <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
                <MessageSquare size={16} className="mr-2" />
                Chat
            </button>
            <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'code' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
                <Code2 size={16} className="mr-2" />
                Code
            </button>
            <button
                onClick={() => setActiveTab('whiteboard')}
                className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'whiteboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
                <PenTool size={16} className="mr-2" />
                Design
            </button>
        </div>

        <div className="flex items-center gap-2">
            <button
                onClick={() => {
                    if (isSpeaking) cancelSpeech();
                    setTtsEnabled(!ttsEnabled);
                }}
                className={`p-2 rounded-lg transition-colors ${ttsEnabled ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-400 hover:bg-slate-100'}`}
                title="Toggle Text-to-Speech"
            >
                {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
            onClick={handleEndInterview}
            className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors"
            >
            <StopCircle className="w-4 h-4 mr-2" />
            End
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Chat Tab */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
            {interview.messages.map((msg, idx) => (
            <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
                <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="flex flex-col gap-2">
                    {msg.image && (
                        <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm max-w-[300px]">
                            <img src={msg.image} alt="Whiteboard snapshot" className="w-full h-auto bg-white" />
                        </div>
                    )}
                    <div
                        className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                        msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                        }`}
                    >
                        {msg.content}
                    </div>
                </div>
                </div>
            </div>
            ))}
            {isTyping && interview.messages[interview.messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
                <div className="flex flex-row items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                    <Bot size={16} />
                </div>
                <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                    <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
                </div>
            </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Code Tab */}
        <div className={`flex-1 p-4 bg-[#1e1e1e] ${activeTab === 'code' ? 'block' : 'hidden'}`}>
             <CodeEditor 
                code={code} 
                onChange={(val) => {
                    if (val !== undefined) setCode(val);
                }} 
             />
        </div>

        {/* Whiteboard Tab */}
        <div className={`flex-1 p-0 bg-white ${activeTab === 'whiteboard' ? 'block' : 'hidden'}`}>
            <Whiteboard 
                initialData={whiteboardData}
                onMount={(editor) => { editorRef.current = editor; }}
                onChange={(data) => setWhiteboardData(data)}
            />
        </div>
      </div>

      {/* Input Area (Always visible) */}
      <div className="p-4 bg-white border-t border-slate-200 z-10">
        <div className="relative flex items-end gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isListening ? "Listening..." : "Type your answer here..."}
            className={`w-full p-3 pl-4 pr-12 bg-slate-50 border rounded-xl focus:ring-2 focus:outline-none resize-none max-h-32 min-h-[50px] scrollbar-hide transition-colors
                ${isListening ? 'border-red-400 ring-2 ring-red-100 bg-red-50 placeholder-red-400' : 'border-slate-300 focus:ring-blue-500'}`}
            rows={1}
          />
          
          <button
            onClick={toggleVoice}
            className={`absolute right-14 bottom-2 p-2 rounded-lg transition-all ${
                isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Voice Input"
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && !isListening) || isTyping}
            className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2 flex items-center justify-center gap-2">
            {activeTab === 'code' && <span className="text-blue-500 font-medium">[Code Mode] AI sees your code.</span>}
            {activeTab === 'whiteboard' && <span className="text-emerald-500 font-medium flex items-center"><ImageIcon size={12} className="mr-1"/> [Design Mode] AI sees your drawing when you send a message.</span>}
            {isListening ? 'Speak now. Click mic to stop.' : 'Press Enter to send.'}
        </p>
      </div>
    </div>
  );
};

export default InterviewRoom;