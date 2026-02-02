import React, { useEffect, useRef, useState } from 'react';
import { User, Bot, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
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
}

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, analysisMap }) => {
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
                    className={`p-3 md:p-4 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card text-foreground border border-border rounded-tl-none'}`}
                  >
                    {msg.role === 'model' ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Inline Feedback Section */}
              {feedback && (
                <div
                  className={`mt-2 max-w-[95%] md:max-w-[75%] ${msg.role === 'user' ? 'mr-10 md:mr-12' : 'ml-10 md:ml-12'}`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFeedback(idx)}
                    className={`h-8 text-xs font-medium border transition-colors ${
                      isExpanded
                        ? 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Lightbulb
                      className={`w-3.5 h-3.5 mr-2 ${isExpanded ? 'text-amber-600' : 'text-slate-400'}`}
                    />
                    {isExpanded ? 'Hide AI Feedback' : 'View AI Feedback'}
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3 ml-1" />
                    ) : (
                      <ChevronDown className="w-3 h-3 ml-1" />
                    )}
                  </Button>

                  {isExpanded && (
                    <Card className="mt-2 bg-amber-50/50 border-amber-100 animate-in fade-in slide-in-from-top-1 duration-200">
                      <CardContent className="p-4 space-y-3 text-sm">
                        <div>
                          <span className="font-semibold text-amber-900 block mb-1 text-xs uppercase tracking-wider">
                            Analysis
                          </span>
                          <p className="text-slate-700 leading-relaxed">{feedback.analysis}</p>
                        </div>
                        <div className="pt-2 border-t border-amber-100/50">
                          <span className="font-semibold text-emerald-800 block mb-1 text-xs uppercase tracking-wider">
                            Better Approach
                          </span>
                          <p className="text-slate-700 leading-relaxed">{feedback.improvement}</p>
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
