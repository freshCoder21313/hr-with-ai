import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import mermaid from 'mermaid';
import { db } from '../../lib/db';
import { generateInterviewFeedback, getStoredAIConfig } from '../../services/geminiService';
import { Interview, InterviewFeedback } from '../../types';
import { CheckCircle2, AlertCircle, BarChart2 } from 'lucide-react';

const FeedbackView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const mermaidRef1 = useRef<HTMLDivElement>(null);
  const mermaidRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
  }, []);

  useEffect(() => {
    const processFeedback = async () => {
      if (!id) return;
      const data = await db.interviews.get(parseInt(id));
      if (data) {
        setInterview(data);
        if (data.feedback) {
          setFeedback(data.feedback);
          setLoading(false);
        } else {
          // Generate new feedback
          try {
            const aiConfig = getStoredAIConfig();
            const newFeedback = await generateInterviewFeedback(data, aiConfig);
            await db.interviews.update(parseInt(id), { feedback: newFeedback });
            setFeedback(newFeedback);
          } catch (e) {
            console.error(e);
          } finally {
            setLoading(false);
          }
        }
      }
    };
    processFeedback();
  }, [id]);

  useEffect(() => {
    const renderCharts = async () => {
      if (feedback && !loading && mermaidRef1.current && mermaidRef2.current) {
        try {
          mermaidRef1.current.innerHTML = '';
          mermaidRef2.current.innerHTML = '';
          
          const { svg: svg1 } = await mermaid.render('mermaid-chart-1', feedback.mermaidGraphCurrent);
          mermaidRef1.current.innerHTML = svg1;
          
          const { svg: svg2 } = await mermaid.render('mermaid-chart-2', feedback.mermaidGraphPotential);
          mermaidRef2.current.innerHTML = svg2;
        } catch (error) {
          console.error("Mermaid rendering failed:", error);
          if (mermaidRef1.current) mermaidRef1.current.innerHTML = '<p class="text-red-500 text-sm">Error rendering chart</p>';
        }
      }
    };
    renderCharts();
  }, [feedback, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">AI is analyzing your performance...</p>
        <p className="text-slate-400 text-sm">Generating comprehensive report & visualization</p>
      </div>
    );
  }

  if (!feedback || !interview) return <div>Error loading feedback</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Score Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Interview Analysis</h1>
          <p className="text-slate-500">{interview.jobTitle} @ {interview.company}</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Overall Score</p>
            </div>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 text-2xl font-bold
                ${feedback.score >= 8 ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 
                  feedback.score >= 6 ? 'border-yellow-500 text-yellow-600 bg-yellow-50' : 
                  'border-red-500 text-red-600 bg-red-50'}`}>
                {feedback.score}
            </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Executive Summary</h3>
        <p className="text-slate-600 leading-relaxed">{feedback.summary}</p>
      </div>

      {/* Mermaid Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-800">Current Performance Flow</h3>
            </div>
            <div ref={mermaidRef1} className="overflow-x-auto flex justify-center py-4 bg-slate-50 rounded-lg"></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">Potential & Improvement Path</h3>
            </div>
            <div ref={mermaidRef2} className="overflow-x-auto flex justify-center py-4 bg-slate-50 rounded-lg"></div>
        </div>
      </div>

      {/* Deep Dive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-6">
            <h3 className="flex items-center text-lg font-bold text-emerald-800 mb-4">
                <CheckCircle2 className="w-5 h-5 mr-2" /> Strengths
            </h3>
            <ul className="space-y-2">
                {feedback.strengths.map((s, i) => (
                    <li key={i} className="flex items-start text-emerald-900 text-sm">
                        <span className="mr-2">•</span> {s}
                    </li>
                ))}
            </ul>
        </div>
        <div className="bg-red-50/50 rounded-xl border border-red-100 p-6">
            <h3 className="flex items-center text-lg font-bold text-red-800 mb-4">
                <AlertCircle className="w-5 h-5 mr-2" /> Areas for Improvement
            </h3>
            <ul className="space-y-2">
                {feedback.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start text-red-900 text-sm">
                        <span className="mr-2">•</span> {w}
                    </li>
                ))}
            </ul>
        </div>
      </div>

      {/* Q&A Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">Key Question Analysis</h3>
          </div>
          <div className="divide-y divide-slate-100">
              {feedback.keyQuestionAnalysis.map((item, idx) => (
                  <div key={idx} className="p-6">
                      <p className="font-medium text-slate-900 mb-2">Q: {item.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                              <span className="font-semibold block mb-1 text-slate-700">Analysis:</span>
                              {item.analysis}
                          </div>
                          <div className="text-sm text-blue-900 bg-blue-50 p-3 rounded border border-blue-100">
                              <span className="font-semibold block mb-1 text-blue-700">Better Approach:</span>
                              {item.improvement}
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default FeedbackView;