import React from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface VoiceMicButtonProps {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({ isListening, onStart, onStop, disabled }) => {
  return (
    <div className="relative flex items-center justify-center">
      {isListening && (
        <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20 scale-150 delay-75 duration-1000" />
      )}
      {isListening && (
        <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30 delay-150 duration-1000" />
      )}
      
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "relative z-10 w-16 h-16 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center",
          isListening 
            ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30 ring-4 ring-red-100" 
            : "bg-primary hover:bg-primary/90 text-white shadow-primary/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={isListening ? onStop : onStart}
        disabled={disabled}
      >
        {isListening ? (
          <Square className="w-6 h-6 fill-current animate-pulse" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </Button>
    </div>
  );
};
