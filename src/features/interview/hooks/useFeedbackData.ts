import { useEffect, useState, useRef } from 'react';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { generateInterviewFeedback } from '@/services/interview/interviewAIService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { Interview, InterviewFeedback } from '@/types';
import { AnalysisItem } from '../components/ChatArea';

export function useFeedbackData(id: string | undefined) {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('analysis');
  const [analysisMap, setAnalysisMap] = useState<Record<number, AnalysisItem>>({});
  const mermaidRef1 = useRef<HTMLDivElement>(null);
  const mermaidRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interview?.messages || !feedback?.keyQuestionAnalysis) return;

    const map: Record<number, AnalysisItem> = {};
    feedback.keyQuestionAnalysis.forEach((analysisItem) => {
      const cleanQuestion = analysisItem.question.trim().substring(0, 50);
      for (let i = 0; i < interview.messages.length - 1; i++) {
        const msg = interview.messages[i];
        if (msg.role === 'model' && msg.content.includes(cleanQuestion)) {
          const nextMsg = interview.messages[i + 1];
          if (nextMsg?.role === 'user') {
            map[i + 1] = analysisItem;
            break;
          }
        }
      }
    });
    setAnalysisMap(map);
  }, [interview, feedback]);

  useEffect(() => {
    const processFeedback = async () => {
      if (!id) {
        setError('No interview ID provided');
        setLoading(false);
        return;
      }
      const data = await db.interviews.get(parseInt(id, 10));
      if (!data) {
        setError('Interview not found');
        setLoading(false);
        return;
      }
      setInterview(data);
      if (data.feedback) {
        setFeedback(data.feedback);
        setLoading(false);
        return;
      }
      try {
        const aiConfig = getStoredAIConfig();
        const newFeedback = await generateInterviewFeedback(data, aiConfig);
        await db.interviews.update(parseInt(id, 10), { feedback: newFeedback });
        setFeedback(newFeedback);
        setError(null);
      } catch (e) {
        logger.error(e);
        setError(
          e instanceof Error
            ? `Failed to generate feedback: ${e.message}`
            : 'Failed to generate feedback'
        );
      } finally {
        setLoading(false);
      }
    };
    processFeedback();
  }, [id]);

  useEffect(() => {
    const renderCharts = async () => {
      if (
        !feedback ||
        loading ||
        !mermaidRef1.current ||
        !mermaidRef2.current ||
        activeTab !== 'analysis'
      ) {
        return;
      }
      try {
        const { default: mermaid } = await import('mermaid');
        const isDarkMode =
          typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkMode ? 'dark' : 'default',
        });

        mermaidRef1.current.innerHTML = '';
        mermaidRef2.current.innerHTML = '';

        if (feedback.mermaidGraphCurrent) {
          try {
            const { svg: svg1 } = await mermaid.render(
              'mermaid-chart-1',
              feedback.mermaidGraphCurrent
            );
            mermaidRef1.current.innerHTML = svg1;
          } catch (chart1Error) {
            logger.error('Mermaid chart 1 rendering failed:', chart1Error);
            if (mermaidRef1.current) {
              mermaidRef1.current.innerHTML =
                '<p class="text-muted-foreground text-xs italic">Unable to render current thinking chart</p>';
            }
          }
        }

        if (feedback.mermaidGraphPotential) {
          try {
            const { svg: svg2 } = await mermaid.render(
              'mermaid-chart-2',
              feedback.mermaidGraphPotential
            );
            mermaidRef2.current.innerHTML = svg2;
          } catch (chart2Error) {
            logger.error('Mermaid chart 2 rendering failed:', chart2Error);
            if (mermaidRef2.current) {
              mermaidRef2.current.innerHTML =
                '<p class="text-muted-foreground text-xs italic">Unable to render potential thinking chart</p>';
            }
          }
        }
      } catch (error) {
        logger.error('Mermaid initialization or loading failed:', error);
      }
    };
    renderCharts();
  }, [feedback, loading, activeTab]);

  return {
    interview,
    setInterview,
    feedback,
    setFeedback,
    loading,
    error,
    activeTab,
    setActiveTab,
    analysisMap,
    mermaidRef1,
    mermaidRef2,
  };
}
