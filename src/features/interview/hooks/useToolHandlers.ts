import { useState, useCallback, useRef } from 'react';
import { Editor, TLShapeId } from 'tldraw';
import { svgToPngBase64 } from '@/lib/svgUtils';
import { Interview, JobRecommendation } from '@/types';
import { db } from '@/lib/db';

interface UseToolHandlersReturn {
  isCodeOpen: boolean;
  setIsCodeOpen: (open: boolean) => void;
  isWhiteboardOpen: boolean;
  setIsWhiteboardOpen: (open: boolean) => void;
  handleRunCode: () => void;
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
}

export const useToolHandlers = (
  currentInterview: Interview | null,
  isSubmitting: boolean,
  setIsSubmitting: (v: boolean) => void
): UseToolHandlersReturn => {
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const handleRunCode = useCallback(() => {
    alert('This feature is coming soon! (Backend integration in progress)');
  }, []);

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
                    console.error('Failed to convert whiteboard SVG to PNG');
                  }
                }
              }
            } catch (e) {
              console.error('Failed to capture whiteboard', e);
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

      const updatedInterview: Interview = {
        ...currentInterview,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.jobDescription,
        tailoredResume: tailoredResumeText,
      };
      await db.interviews.put(updatedInterview, interviewId);
      setInterview(updatedInterview);
    },
    [currentInterview]
  );

  return {
    isCodeOpen,
    setIsCodeOpen,
    isWhiteboardOpen,
    setIsWhiteboardOpen,
    handleRunCode,
    handleToolSubmit,
    handleSelectJob,
    editorRef,
  };
};
