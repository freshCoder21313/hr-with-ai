import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoiceInterview } from '../hooks/useVoiceInterview';
import { VoiceMicButton } from './VoiceMicButton';
import { AudioVisualizer } from './AudioVisualizer';
import { AIAvatarSpeaking } from './AIAvatarSpeaking';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Settings, PhoneMissed, MessageSquare } from 'lucide-react';
import { useInterviewStore } from '../interviewStore';

interface VoiceInterviewRoomProps {
    onSwitchToText?: () => void;
}

export const VoiceInterviewRoom: React.FC<VoiceInterviewRoomProps> = ({ onSwitchToText }) => {
    const navigate = useNavigate();
    
    // Hook handles logic
    const { 
        isListening, 
        isSpeaking, 
        transcript, 
        interimTranscript, 
        state: interviewState,
        audioLevel,
        startListening,
        stopAndSend,
        endInterview,
        interruptAI
    } = useVoiceInterview();

    // Access store directly for messages state
    const { currentInterview } = useInterviewStore();
    const messages = currentInterview?.messages || [];

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex flex-col h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white overflow-hidden">
            {/* Header / Status Bar */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-sm">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">Voice Interview</h2>
                    <p className="text-xs text-slate-400">
                        {interviewState === 'idle' && 'Ready'}
                        {interviewState === 'listening' && 'Listening to you...'}
                        {interviewState === 'processing_stt' && 'Processing audio...'}
                        {interviewState === 'waiting_ai' && 'AI is thinking...'}
                        {interviewState === 'speaking_tts' && 'AI is speaking...'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {onSwitchToText && (
                        <Button variant="ghost" size="sm" onClick={onSwitchToText} className="text-slate-400 hover:text-white gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Text Mode
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                        <Settings className="w-5 h-5" />
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-2" onClick={() => {
                        endInterview();
                        navigate('/dashboard'); 
                    }}>
                        <PhoneMissed className="w-4 h-4" />
                        End Call
                    </Button>
                </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 flex flex-col items-center justify-center relative p-8 gap-8">
                
                {/* AI Avatar Area */}
                <div className="flex flex-col items-center gap-4 transition-all duration-500">
                    <AIAvatarSpeaking isSpeaking={isSpeaking} size="lg" />
                    <div className={cn(
                        "text-center max-w-2xl px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 transition-opacity duration-300",
                        isSpeaking ? "opacity-100" : "opacity-0 invisible"
                    )}>
                        <p className="text-lg text-slate-200 leading-relaxed font-light">
                            {/* Display latest AI message content */}
                            {messages.filter(m => m.role === 'model').slice(-1)[0]?.content || "..."}
                        </p>
                    </div>
                </div>

                {/* User Active Transcript Area (Interim) */}
                <div className={cn(
                    "absolute bottom-32 w-full max-w-3xl px-6 text-center transition-all duration-300",
                    isListening ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                )}>
                    <p className="text-2xl font-medium text-white drop-shadow-md">
                        {transcript || interimTranscript || "Start speaking..."}
                    </p>
                    <div className="mt-4 flex justify-center h-12">
                         <AudioVisualizer audioLevel={audioLevel} isListening={isListening} />
                    </div>
                </div>
            </div>

            {/* Bottom Control Bar */}
            <div className="h-24 bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center justify-center gap-8 relative px-8">
                
                {/* Transcript Toggle (Left) */}
                <div className="absolute left-8 hidden md:block">
                     <Button variant="ghost" className="text-slate-400 hover:text-white text-xs uppercase tracking-wider">
                        Show Transcript
                     </Button>
                </div>

                {/* Mic Control (Center) */}
                <div className="transform -translate-y-4">
                    <VoiceMicButton 
                        isListening={isListening} 
                        onStart={startListening} 
                        onStop={stopAndSend} 
                    />
                    <p className="text-center text-xs mt-2 text-slate-400 font-medium uppercase tracking-widest">
                        {isListening ? 'Tap to Send' : 'Tap to Speak'}
                    </p>
                </div>

                {/* Settings (Right) */}
                <div className="absolute right-8 hidden md:block">
                    {/* Placeholder for mode switch */}
                </div>
            </div>
            {/* Hidden ref for scrolling logic if we had a transcript panel */}
            <div ref={messagesEndRef} />
        </div>
    );
};
