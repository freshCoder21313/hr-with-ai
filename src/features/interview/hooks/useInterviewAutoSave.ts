import { useEffect, useRef } from 'react';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { useDebounce } from '@/hooks/useDebounce';
import { useInterviewStore } from '../interviewStore';

export function useInterviewAutoSave() {
  const currentInterview = useInterviewStore((state) => state.currentInterview);
  const code = currentInterview?.code;
  const whiteboard = currentInterview?.whiteboard;
  const interviewId = currentInterview?.id;

  const debouncedCode = useDebounce(code, 1000);
  const debouncedWhiteboard = useDebounce(whiteboard, 1500);

  // Track initial mounted values to prevent immediate redundant writes on load
  const initialCodeRef = useRef<string | undefined>(code);
  const initialWhiteboardRef = useRef<string | undefined>(whiteboard);
  const isFirstCodeRun = useRef(true);
  const isFirstWhiteboardRun = useRef(true);

  useEffect(() => {
    if (isFirstCodeRun.current) {
      isFirstCodeRun.current = false;
      return;
    }
    if (!interviewId || debouncedCode === undefined || debouncedCode === initialCodeRef.current) return;
    initialCodeRef.current = debouncedCode;

    db.interviews
      .update(interviewId, { code: debouncedCode, updatedAt: Date.now() })
      .catch((err) => logger.error('Failed to auto-save code to Dexie', err));
  }, [interviewId, debouncedCode]);

  useEffect(() => {
    if (isFirstWhiteboardRun.current) {
      isFirstWhiteboardRun.current = false;
      return;
    }
    if (!interviewId || debouncedWhiteboard === undefined || debouncedWhiteboard === initialWhiteboardRef.current) return;
    initialWhiteboardRef.current = debouncedWhiteboard;

    db.interviews
      .update(interviewId, { whiteboard: debouncedWhiteboard, updatedAt: Date.now() })
      .catch((err) => logger.error('Failed to auto-save whiteboard to Dexie', err));
  }, [interviewId, debouncedWhiteboard]);
}
