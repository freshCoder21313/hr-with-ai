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
      if (!id) return;
      const data = await db.interviews.get(parseInt(id, 10));
      if (!data) {
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
      } catch (e) {
        logger.error(e);
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
        mermaid.initialize({ startOnLoad: false, theme: 'default' });

        mermaidRef1.current.innerHTML = '';
        mermaidRef2.current.innerHTML = '';
        const { svg: svg1 } = await mermaid.render('mermaid-chart-1', feedback.mermaidGraphCurrent);
        mermaidRef1.current.innerHTML = svg1;
        const { svg: svg2 } = await mermaid.render(
          'mermaid-chart-2',
          feedback.mermaidGraphPotential
        );
        mermaidRef2.current.innerHTML = svg2;
      } catch (error) {
        logger.error('Mermaid rendering failed:', error);
        if (mermaidRef1.current) {
          mermaidRef1.current.innerHTML =
            '<p class="text-red-500 text-sm">Error rendering chart</p>';
        }
      }
    };
    renderCharts();
  }, [feedback, loading, activeTab]);

  return {
    interview,
    feedback,
    loading,
    activeTab,
    setActiveTab,
    analysisMap,
    mermaidRef1,
    mermaidRef2,
  };
}
