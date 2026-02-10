import React, { useEffect, useRef, useState } from 'react';
import { User, Bot, Lightbulb, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Message } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface AnalysisItem {
  question: string;
  analysis: string;
  improvement: string;
}

interface ChatAreaProps {
  messages: Message[];
  analysisMap?: Record<number, AnalysisItem>; // Key is message index
  onRetry?: () => void;
  isProcessing?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  analysisMap,
  onRetry,
  isProcessing,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Track which feedback items are expanded
  const [expandedFeedback, setExpandedFeedback] = useState<Record<number, boolean>>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll to bottom on initial load if we are not in "review mode" (implied by presence of analysisMap)
    // If analysisMap is present, user might be reading history, so maybe don't force scroll?
    // For now, consistent behavior is safer.
    scrollToBottom();
  }, [messages]);

  const toggleFeedback = (idx: number) => {
    setExpandedFeedback((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <div className="flex-1 overflow-hidden relative flex flex-col bg-muted/30">
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6">
        {messages.map((msg, idx) => {
          const feedback = analysisMap?.[idx];
          const isExpanded = expandedFeedback[idx];

          return (
            <div
              key={idx}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`flex max-w-[95%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 md:gap-3`}
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-sm border ${msg.role === 'user' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-card text-muted-foreground border-border'}`}
                >
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className="flex flex-col gap-2 w-full">
                  {msg.image && (
                    <div className="rounded-lg overflow-hidden border border-border shadow-sm max-w-[200px]">
                      <img
                        src={msg.image}
                        alt="Whiteboard snapshot"
                        className="w-full h-auto bg-card"
                      />
                    </div>
                  )}
                  <div
                    className={`p-3 md:p-4 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : msg.isError
                          ? 'bg-destructive/10 text-destructive border-destructive/50 border rounded-tl-none'
                          : 'bg-card text-foreground border border-border rounded-tl-none'
                    }`}
                  >
                    {msg.role === 'model' ? (
                      msg.isError ||
                      (!msg.content && (!isProcessing || idx !== messages.length - 1)) ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 font-semibold">
                            <AlertCircle size={16} />
                            <span>
                              {msg.isError
                                ? 'Failed to generate response'
                                : 'Empty response received'}
                            </span>
                          </div>
                          <div className="text-xs opacity-90">
                            {msg.content || 'The AI sent an empty message.'}
                          </div>
                          {onRetry && idx === messages.length - 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={onRetry}
                              className="self-start mt-1 gap-2 border-destructive/30 hover:bg-destructive/10 text-destructive hover:text-destructive h-8"
                            >
                              <RefreshCw size={14} />
                              Retry
                            </Button>
                          )}
                        </div>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Inline Feedback Section */}
              {feedback && (
                <div
                  className={`mt-3 max-w-[95%] md:max-w-[75%] ${
                    msg.role === 'user' ? 'mr-10 md:mr-12' : 'ml-10 md:ml-12'
                  } animate-in fade-in slide-in-from-top-2 duration-300`}
                >
                  {!isExpanded ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFeedback(idx)}
                      className="h-7 text-xs font-medium bg-background/50 border-amber-200/50 text-amber-600 hover:text-amber-700 hover:bg-amber-50/50 hover:border-amber-300 dark:border-amber-800/30 dark:text-amber-500 dark:hover:bg-amber-900/20 rounded-full"
                    >
                      <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                      View AI Analysis
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  ) : (
                    <Card className="bg-amber-50/80 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/40 shadow-sm overflow-hidden">
                      <div
                        className="px-4 py-2 flex items-center justify-between bg-amber-100/50 dark:bg-amber-900/20 border-b border-amber-200/50 dark:border-amber-800/30 cursor-pointer hover:bg-amber-100/70 dark:hover:bg-amber-900/30 transition-colors"
                        onClick={() => toggleFeedback(idx)}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">
                          <Lightbulb className="w-3.5 h-3.5" />
                          AI Feedback
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-amber-700/50 hover:text-amber-800 dark:text-amber-500/50 dark:hover:text-amber-400"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <CardContent className="p-4 space-y-4 text-sm">
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                            Analysis
                          </span>
                          <div className="text-muted-foreground leading-relaxed">
                            <MarkdownRenderer content={feedback.analysis} />
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-3 border-t border-amber-200/30 dark:border-amber-800/30">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                            Better Approach
                          </span>
                          <div className="text-muted-foreground leading-relaxed">
                            <MarkdownRenderer content={feedback.improvement} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
