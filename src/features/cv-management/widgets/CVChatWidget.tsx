import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useCVManagement } from '../hooks/useCVManagement';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const CVChatWidget: React.FC = () => {
  const { selectedCvId, chatHistory, sendMessage, chatStatus, clearChat } = useCVManagement();

  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isDisabled = !selectedCvId;
  const isLoading = chatStatus === 'loading';

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  const handleSendMessage = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const suggestionPrompts = [
    'Summarize this resume.',
    "What are the candidate's key skills?",
    'How many years of experience with React do they have?',
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Chat with CV</CardTitle>
        {chatHistory.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat}>
            Clear
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto p-4 space-y-4">
        {isDisabled ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-slate-500">Select a CV to enable chat.</p>
          </div>
        ) : chatHistory.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="mb-4 text-slate-500">Ask anything about the resume.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
              {suggestionPrompts.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(prompt)}
                  className="text-xs h-auto py-2"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex items-end gap-2', {
                  'justify-end': msg.role === 'user',
                  'justify-start': msg.role === 'assistant',
                })}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0"></div>
                )}
                <div
                  className={cn('max-w-[75%] rounded-lg px-3 py-2 text-sm', {
                    'bg-blue-500 text-white': msg.role === 'user',
                    'bg-slate-100 dark:bg-slate-800': msg.role === 'assistant',
                  })}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0"></div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </CardContent>
      <CardFooter className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex w-full items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask a question..."
            className="flex-grow resize-none overflow-y-hidden rounded-md border border-slate-300 dark:border-slate-700 bg-transparent p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={1}
            disabled={isDisabled}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isDisabled || !input.trim()}
            size="icon"
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
