import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  multiline?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  style?: React.CSSProperties;
}

export const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onSave,
  className,
  as: Tag = 'span',
  multiline = false,
  placeholder = 'Click to edit...',
  readOnly = false,
  style,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Move cursor to the end
      if (
        inputRef.current instanceof HTMLInputElement ||
        inputRef.current instanceof HTMLTextAreaElement
      ) {
        inputRef.current.setSelectionRange(tempValue.length, tempValue.length);
      } else {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(inputRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [isEditing, tempValue.length]);

  const handleSave = () => {
    setIsEditing(false);
    if (tempValue.trim() !== value.trim()) {
      onSave(tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(value);
    }
  };

  if (readOnly) {
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    );
  }

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full bg-transparent border-b-2 border-blue-400 focus:outline-none focus:bg-slate-50/50 resize-none print:hidden',
            className
          )}
          style={style}
          rows={Math.max(3, tempValue.split('\n').length)}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full bg-transparent border-b-2 border-blue-400 focus:outline-none focus:bg-slate-50/50 print:hidden',
          className
        )}
        style={style}
      />
    );
  }

  return (
    <Tag
      className={cn(
        'group relative cursor-pointer hover:bg-slate-100/50 transition-colors rounded -mx-1 px-1 print:m-0 print:p-0 print:hover:bg-transparent',
        className,
        !value && 'text-slate-400 italic'
      )}
      style={style}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      {value || placeholder}
      <Pencil className="w-3 h-3 absolute -right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity print:hidden" />
    </Tag>
  );
};
