import React, { useEffect, useState } from 'react';
import { Code2, PenTool, Send, Lightbulb, Sparkles, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import InterviewHintView from '@/features/interview/InterviewHintView';
import { InterviewHints } from '@/services/interview/interviewAIService';
import { LoadingButton } from '@/components/ui/loading-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBrowserSpeechToText } from '@/features/interview/hooks/useBrowserSpeechToText';
import { isNonEmptyString } from '@/lib/validation';
import { InterviewContentType } from '@/types';

interface InputAreaProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  onSendMessage: (overrideText?: string) => void;

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
  language?: string;
  /** Interview content type; gates Code/Whiteboard tool visibility. */
  contentType?: InterviewContentType;
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
  language,
  contentType,
}) => {
  const { isListening, toggleListening, transcript } = useBrowserSpeechToText(language || 'vi-VN');
  const [baseText, setBaseText] = useState('');

  const handleToggleListening = React.useCallback(() => {
    if (!isListening) {
      // Capture the current input before starting to listen
      setBaseText(inputValue);
    }
    toggleListening();
  }, [isListening, inputValue, toggleListening]);
  const showTools = contentType === 'coding' || contentType === 'system_design';
  useEffect(() => {
    if (isListening && transcript) {
      setInputValue((baseText + ' ' + transcript).trim());
    }
  }, [transcript, isListening, baseText, setInputValue]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Match the disabled send button: a second send mid-stream supersedes
      // the running answer and orphans its partial text. The typed text is
      // left in place so blocking the send never costs the user their input.
      if (isProcessing) return;
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
                aria-label="AI suggests: open the code editor"
                className="rounded-full shadow-lg gap-2"
                size="xs"
              >
                <Sparkles size={14} aria-hidden="true" /> AI suggests: Open Code Editor
              </Button>
            )}
            {suggestedAction === 'draw' && (
              <Button
                onClick={() => setIsWhiteboardOpen(true)}
                aria-label="AI suggests: use the whiteboard"
                className="rounded-full shadow-lg gap-2"
                size="xs"
              >
                <Sparkles size={14} aria-hidden="true" /> AI suggests: Use Whiteboard
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
                aria-label="Get AI hints"
                onClick={onGetHints}
                disabled={isLoadingHints}
                isLoading={isLoadingHints}
                className={cn(
                  // Both breakpoints are set deliberately: tailwind-merge
                  // would keep `md:h-10` from `size="icon"` and invert the
                  // two sizes.
                  'h-[44px] w-[44px] md:h-[50px] md:w-[50px] rounded-xl shrink-0 border-warning/40 bg-warning/10 text-warning hover:bg-warning/20',
                  isLoadingHints ? 'animate-pulse' : ''
                )}
              >
                <Lightbulb size={20} aria-hidden="true" />
              </LoadingButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>Get AI Hints</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Tools Group (only relevant for coding / system-design interviews) */}
        {showTools && (
          <div className="flex gap-1 mr-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isCodeOpen ? 'default' : 'outline'}
                  size="icon"
                  aria-label="Open code editor"
                  aria-pressed={isCodeOpen}
                  onClick={() => setIsCodeOpen(true)}
                  className={cn(
                    'h-[44px] w-[44px] md:h-[50px] md:w-[50px] rounded-xl shrink-0',
                    !isCodeOpen && 'text-primary bg-primary/5 border-primary/40 hover:bg-primary/10'
                  )}
                >
                  <Code2 size={20} aria-hidden="true" />
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
                  aria-label="Open whiteboard"
                  aria-pressed={isWhiteboardOpen}
                  onClick={() => setIsWhiteboardOpen(true)}
                  className={cn(
                    'h-[44px] w-[44px] md:h-[50px] md:w-[50px] rounded-xl shrink-0',
                    !isWhiteboardOpen &&
                      'text-success bg-success/5 border-success/40 hover:bg-success/10'
                  )}
                >
                  <PenTool size={20} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open Whiteboard</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="relative flex-1">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            enterKeyHint="send"
            placeholder="Type your answer..."
            aria-label="Interview answer"
            className={cn(
              'w-full min-h-[44px] max-h-[120px] resize-none pr-10 md:pr-12 py-2.5 md:py-3 shadow-sm text-sm md:text-base'
            )}
            rows={1}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={isListening}
                className={cn(
                  'absolute right-1 bottom-1 h-9 w-9 md:h-10 md:w-10 rounded-xl',
                  isListening
                    ? 'text-destructive animate-pulse hover:bg-destructive/10'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={handleToggleListening}
              >
                <Mic size={18} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isListening ? 'Stop Listening' : 'Start Voice Input'}</p>
            </TooltipContent>
          </Tooltip>
          <p className="hidden md:block text-[11px] text-muted-foreground mt-1">
            Enter to send · Shift+Enter for new line
          </p>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => onSendMessage()}
              disabled={!isNonEmptyString(inputValue) || isProcessing}
              aria-label="Send message"
              className="h-[44px] w-[44px] md:h-[50px] md:w-[50px] rounded-xl shrink-0"
              size="icon"
              data-testid="send-button"
            >
              <Send size={18} aria-hidden="true" />
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
