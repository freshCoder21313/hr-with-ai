import React from 'react';
import { Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { LoadingButton } from '@/components/ui/loading-button';

interface SimpleInputAreaProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const SimpleInputArea: React.FC<SimpleInputAreaProps> = ({
  onSendMessage,
  disabled,
  placeholder,
}) => {
  const [inputValue, setInputValue] = React.useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-white border-t border-slate-200 z-10 shrink-0">
      <div className="relative flex items-end gap-2 max-w-5xl mx-auto">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder || 'Type your message...'}
          disabled={disabled}
          className="w-full min-h-[44px] max-h-[120px] resize-none pr-12 py-3 shadow-sm"
          rows={1}
        />
        <LoadingButton
          onClick={handleSend}
          disabled={!inputValue.trim() || disabled}
          className="h-[44px] w-[44px] rounded-xl shrink-0"
          size="icon"
          isLoading={disabled}
        >
          <Send size={18} />
        </LoadingButton>
      </div>
    </div>
  );
};
