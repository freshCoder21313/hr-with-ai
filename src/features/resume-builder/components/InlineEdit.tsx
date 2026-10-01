import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_PLACEHOLDER = 'Click to edit...';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  multiline?: boolean;
  placeholder?: string;
  /** Accessible name for the edit field; falls back to the placeholder, then a generic name. */
  label?: string;
  readOnly?: boolean;
  style?: React.CSSProperties;
}

export const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onSave,
  className,
  as: Tag = 'span',
  multiline = false,
  placeholder = DEFAULT_PLACEHOLDER,
  label,
  readOnly = false,
  style,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  /** True only while a user-initiated edit session is open; guards blur. */
  const editingRef = useRef(false);
  /** Set when leaving edit mode via keyboard so focus can be restored. */
  const returnFocusRef = useRef(false);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  // Focus and place the caret once, on entering edit mode. Keying this on
  // `tempValue.length` re-ran it on every keystroke and yanked the caret to the
  // end when typing in the middle of a field.
  useEffect(() => {
    if (!isEditing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const end = el.value.length;
      el.setSelectionRange(end, end);
    } else if (el.isContentEditable) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  // The trigger only exists once edit mode has ended, so focus is restored here
  // rather than inside the key handler.
  useEffect(() => {
    if (isEditing || !returnFocusRef.current) return;
    returnFocusRef.current = false;
    triggerRef.current?.focus();
  }, [isEditing]);

  const reportSaveFailure = (error: unknown) => {
    logger.error('Inline edit save failed', error);
    toast.error('Failed to save change');
  };

  const startEditing = () => {
    if (readOnly) return;
    setTempValue(value);
    editingRef.current = true;
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setIsEditing(false);
    if (tempValue.trim() === value.trim()) return;
    try {
      const result = onSave(tempValue);
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(reportSaveFailure);
      }
    } catch (error) {
      reportSaveFailure(error);
    }
  };

  /** End the edit session, optionally committing the pending value. */
  const exitEditing = (commit: boolean) => {
    returnFocusRef.current = true;
    if (commit) {
      handleSave();
    } else {
      editingRef.current = false;
      setIsEditing(false);
      setTempValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      exitEditing(true);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      exitEditing(false);
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      startEditing();
    }
  };

  if (readOnly) {
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    );
  }

  const fieldLabel = label || (placeholder !== DEFAULT_PLACEHOLDER ? placeholder : 'Edit field');

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={tempValue}
          aria-label={fieldLabel}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={cn(
            // Fixed light colors on purpose: the resume preview paper is always
            // white (`bg-white` on every template root), so semantic tokens
            // would render dark-on-white in dark mode.
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
        aria-label={fieldLabel}
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
        // Fixed light colors, see the note above: this renders on the white
        // resume paper and on the templates' dark sidebars, not on app chrome.
        'group relative cursor-pointer hover:bg-slate-100/50 transition-colors rounded -mx-1 px-1 print:m-0 print:p-0 print:hover:bg-transparent',
        className,
        !value && 'text-slate-400 italic'
      )}
      style={style}
      onClick={startEditing}
    >
      {/* The tag stays a real heading (h1/h3/h4); an inner inline span carries
          the button semantics so keyboard users can reach every field without
          destroying document structure. */}
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={label ? `${label}, edit` : undefined}
        title="Click to edit"
        onKeyDown={handleTriggerKeyDown}
        className="rounded-sm outline-none box-decoration-clone focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 print:outline-none"
      >
        {value || placeholder}
      </span>
      <Pencil className="w-3 h-3 absolute -right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 group-focus-within:opacity-50 transition-opacity print:hidden" />
    </Tag>
  );
};
