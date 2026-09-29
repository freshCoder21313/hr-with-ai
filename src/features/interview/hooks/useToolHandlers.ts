import { useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import type { Editor, TLShapeId } from 'tldraw';
import { svgToPngBase64 } from '@/lib/svgUtils';
import { Interview, JobRecommendation } from '@/types';
import { db } from '@/lib/db';
import { useInterviewStore } from '@/features/interview/interviewStore';

interface UseToolHandlersReturn {
  isCodeOpen: boolean;
  setIsCodeOpen: (open: boolean) => void;
  isWhiteboardOpen: boolean;
  setIsWhiteboardOpen: (open: boolean) => void;
  handleToolSubmit: (
    type: 'code' | 'whiteboard',
    sendMessage: (content: string, image?: string) => Promise<void>
  ) => Promise<void>;
  handleSelectJob: (
    job: JobRecommendation,
    tailoredResumeText: string,
    interviewId: number,
    setInterview: (i: Interview | null) => void
  ) => Promise<void>;
  editorRef: React.MutableRefObject<Editor | null>;
  setEditor: (editor: Editor | null) => void;
}

export const useToolHandlers = (
  currentInterview: Interview | null,
  isSubmitting: boolean,
  setIsSubmitting: (v: boolean) => void
): UseToolHandlersReturn => {
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const editorRef = useRef<Editor | null>(null);


  const handleToolSubmit = useCallback(
    async (
      type: 'code' | 'whiteboard',
      sendMessage: (content: string, image?: string) => Promise<void>
    ) => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        let content = '';
        let imageBase64: string | undefined = undefined;

        if (type === 'code') {
          const code = (currentInterview as { code?: string })?.code || '';
          content = `Here is my solution:\n\n\`\`\`javascript\n${code}\n\`\`\``;
          setIsCodeOpen(false);
        } else if (type === 'whiteboard') {
          if (editorRef.current) {
            try {
              const shapeIds = Array.from(
                editorRef.current.getCurrentPageShapeIds()
              ) as TLShapeId[];
              if (shapeIds.length > 0) {
                const svg = await editorRef.current.getSvg(shapeIds, {
                  background: true,
                  scale: 1,
                });
                if (svg) {
                  const pngData = await svgToPngBase64(svg);
                  if (pngData) {
                    imageBase64 = pngData;
                  } else {
                    logger.error('Failed to convert whiteboard SVG to PNG');
                  }
                }
              }
            } catch (e) {
              logger.error('Failed to capture whiteboard', e);
            }
          }
          content = 'I have sketched the system design. Please review the attached diagram.';
          setIsWhiteboardOpen(false);
        }

        if (content) {
          await sendMessage(content, imageBase64);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, setIsSubmitting, currentInterview]
  );

  const handleSelectJob = useCallback(
    async (
      job: JobRecommendation,
      tailoredResumeText: string,
      interviewId: number,
      setInterview: (i: Interview | null) => void
    ) => {
      if (!currentInterview) return;

      // Do not write a whole-row snapshot taken from a render-time closure: a
      // stream in flight would have its messages wiped by the older copy.
      // Re-read live state and mutate only the job fields.
      const live = useInterviewStore.getState().currentInterview;
      if (!live || live.id !== interviewId) return;

      const updatedInterview: Interview = {
        ...live,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.jobDescription,
        tailoredResume: tailoredResumeText,
      };
      await db.interviews.update(interviewId, {
        jobTitle: updatedInterview.jobTitle,
        company: updatedInterview.company,
        jobDescription: updatedInterview.jobDescription,
        tailoredResume: updatedInterview.tailoredResume,
      });
      setInterview(updatedInterview);
    },
    [currentInterview]
  );

  const setEditor = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  return {
    isCodeOpen,
    setIsCodeOpen,
    isWhiteboardOpen,
    setIsWhiteboardOpen,
    handleToolSubmit,
    handleSelectJob,
    editorRef,
    setEditor,
  };
};
