import React from 'react';
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';

interface AIAvatarSpeakingProps {
  isSpeaking: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AIAvatarSpeaking: React.FC<AIAvatarSpeakingProps> = ({ isSpeaking, size = 'lg' }) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-32 h-32"
  };

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-16 h-16"
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Ripple effects when speaking */}
      {isSpeaking && (
        <>
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping duration-[2000ms]" />
            <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping delay-300 duration-[2500ms]" />
        </>
      )}
      
      <div className={cn(
        "relative z-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl transition-transform duration-300",
        sizeClasses[size],
        isSpeaking ? "scale-105 shadow-blue-500/50" : "scale-100"
      )}>
        <Bot className={cn("text-white fill-white/20", iconSizes[size], isSpeaking && "animate-pulse")} />
      </div>
      
      {/* Status Dot */}
      <div className={cn(
        "absolute -bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white",
        isSpeaking ? "bg-green-500 animate-bounce" : "bg-gray-400"
      )} />
    </div>
  );
};
