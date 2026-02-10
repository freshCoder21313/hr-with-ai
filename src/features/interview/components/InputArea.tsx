import React from 'react';
import { Code2, PenTool, Send, Lightbulb, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import InterviewHintView from '../InterviewHintView';
import { InterviewHints } from '@/services/geminiService';
import { LoadingButton } from '@/components/ui/loading-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InputAreaProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  onSendMessage: () => void;


  // Tools
  isCodeOpen: boolean;
  setIsCodeOpen: (open: boolean) => void;
  isWhiteboardOpen: boolean;
  setIsWhiteboardOpen: (open: boolean) => void;

  // Smart Action
  suggestedAction: 'code' | 'draw' | null;
  isProcessing: boolean;

  // Hints
  hints: InterviewHints | null;
  setHints: (hints: InterviewHints | null) => void;
  isLoadingHints: boolean;
  onGetHints: () => void;
  hintsEnabled?: boolean;

}

export const InputArea: React.FC<InputAreaProps> = ({
  inputValue,
  setInputValue,
  onSendMessage,

  isCodeOpen,
  setIsCodeOpen,
  isWhiteboardOpen,
  setIsWhiteboardOpen,
  suggestedAction,
  isProcessing,
  hints,
  setHints,
  isLoadingHints,
  onGetHints,
  hintsEnabled,

}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="p-2 md:p-4 bg-background border-t border-border z-10 shrink-0 safe-area-bottom">
      {/* Suggested Action Chip */}
      {suggestedAction && !isProcessing && (
        <div className="absolute -top-12 left-0 w-full flex justify-center pointer-events-none">
          <div className="pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-300">
            {suggestedAction === 'code' && (
              <Button
                onClick={() => setIsCodeOpen(true)}
                className="rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                size="sm"
              >
                <Sparkles size={14} /> AI suggests: Open Code Editor
              </Button>
            )}
            {suggestedAction === 'draw' && (
              <Button
                onClick={() => setIsWhiteboardOpen(true)}
                className="rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                size="sm"
              >
                <Sparkles size={14} /> AI suggests: Use Whiteboard
              </Button>
            )}
          </div>
        </div>
      )}

      {hints && (
        <div className="max-w-5xl mx-auto mb-2">
          <InterviewHintView hints={hints} onClose={() => setHints(null)} />
        </div>
      )}

      <div className="relative flex items-end gap-2 max-w-5xl mx-auto">
        {/* Hints Button */}
        {hintsEnabled !== false && (
          <Tooltip>
            <TooltipTrigger asChild>
              <LoadingButton
                variant="outline"
                size="icon"
                onClick={onGetHints}
                disabled={isLoadingHints}
                isLoading={isLoadingHints}
                className={cn(
                  'h-[44px] w-[44px] md:h-[50px] md:w-[50px] rounded-xl shrink-0 border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/40',
                  isLoadingHints ? 'animate-pulse' : ''
                )}
              >
                <Lightbulb size={20} />
              </LoadingButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>Get AI Hints</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Tools Group */}
        <div className="flex gap-1 mr-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isCodeOpen ? 'default' : 'outline'}
                size="icon"
                onClick={() => setIsCodeOpen(true)}
                className={cn(
                  'h-[44px] w-[44px] md:h-[50px] md:w-[50px] rounded-xl shrink-0',
                  isCodeOpen
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-900/40'
                )}
              >
                <Code2 size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open Code Editor</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isWhiteboardOpen ? 'default' : 'outline'}
                size="icon"
                onClick={() => setIsWhiteboardOpen(true)}
                className={cn(
                  'h-[44px] w-[44px] md:h-[50px] md:w-[50px] rounded-xl shrink-0',
                  isWhiteboardOpen
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/40'
                )}
              >
                <PenTool size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open Whiteboard</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="relative flex-1">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder='Type your answer...'
            className={cn(
              'w-full min-h-[44px] max-h-[120px] resize-none pr-10 md:pr-12 py-2.5 md:py-3 shadow-sm text-sm md:text-base'
            )}
            rows={1}
          />

        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onSendMessage}
              disabled={!inputValue.trim()}
              className="h-[44px] w-[44px] md:h-[50px] md:w-[50px] rounded-xl shrink-0"
              size="icon"
            >
              <Send size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Send Message</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
