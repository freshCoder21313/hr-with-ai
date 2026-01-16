import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import mermaid from 'mermaid';
import { db } from '@/lib/db';
import { generateInterviewFeedback, getStoredAIConfig } from '@/services/geminiService';
import { Interview, InterviewFeedback } from '@/types';
import { CheckCircle2, AlertCircle, BarChart2, BookOpen, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
        <p className="text-slate-600 font-medium text-lg">AI is analyzing your performance...</p>
        <p className="text-slate-400">Generating comprehensive report & visualization</p>
      </div>
    );
  }

  if (!feedback || !interview) return <div className="p-8 text-center text-red-500">Error loading feedback</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 p-6 md:p-8">
      {/* Score Header */}
      <Card className="border-none shadow-md bg-white">
        <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 p-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Interview Analysis</h1>
            <p className="text-slate-500 text-lg">{interview.jobTitle} @ {interview.company}</p>
          </div>
          <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                  <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Overall Score</p>
              </div>
              <div className={`w-24 h-24 rounded-full flex items-center justify-center border-[6px] text-3xl font-bold shadow-sm
                  ${feedback.score >= 8 ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 
                    feedback.score >= 6 ? 'border-yellow-500 text-yellow-600 bg-yellow-50' : 
                    'border-red-500 text-red-600 bg-red-50'}`}>
                  {feedback.score}
              </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 leading-relaxed text-lg">{feedback.summary}</p>
        </CardContent>
      </Card>

      {/* Mermaid Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart2 className="w-5 h-5 text-blue-600" />
                    Current Performance Flow
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div ref={mermaidRef1} className="overflow-x-auto flex justify-center py-4 bg-slate-50/50 rounded-lg min-h-[200px] items-center"></div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart2 className="w-5 h-5 text-emerald-600" />
                    Potential & Improvement Path
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div ref={mermaidRef2} className="overflow-x-auto flex justify-center py-4 bg-slate-50/50 rounded-lg min-h-[200px] items-center"></div>
            </CardContent>
        </Card>
      </div>

      {/* Deep Dive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-emerald-50/30 border-emerald-100">
            <CardHeader>
                <CardTitle className="flex items-center text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Strengths
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {feedback.strengths.map((s, i) => (
                        <li key={i} className="flex items-start text-emerald-900 text-sm">
                            <span className="mr-2 text-emerald-500">•</span> {s}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
        <Card className="bg-red-50/30 border-red-100">
            <CardHeader>
                <CardTitle className="flex items-center text-red-800">
                    <AlertCircle className="w-5 h-5 mr-2" /> Areas for Improvement
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {feedback.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start text-red-900 text-sm">
                            <span className="mr-2 text-red-500">•</span> {w}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
      </div>

      {/* Learning Resources */}
      {feedback.recommendedResources && feedback.recommendedResources.length > 0 && (
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    Recommended Learning Resources
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {feedback.recommendedResources.map((res, idx) => (
                        <a 
                            key={idx}
                            href={`https://www.google.com/search?q=${encodeURIComponent(res.searchQuery)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="group block p-4 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
                        >
                            <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-purple-700 flex items-center justify-between text-sm">
                                {res.topic}
                                <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-2">{res.description}</p>
                        </a>
                    ))}
                </div>
            </CardContent>
          </Card>
      )}

      {/* Q&A Analysis */}
      <Card>
          <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle>Key Question Analysis</CardTitle>
          </CardHeader>
          <div className="divide-y divide-slate-100">
              {feedback.keyQuestionAnalysis.map((item, idx) => (
                  <div key={idx} className="p-6">
                      <p className="font-medium text-slate-900 mb-3 text-lg">Q: {item.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100">
                              <span className="font-semibold block mb-2 text-slate-900 uppercase text-xs tracking-wider">Analysis</span>
                              {item.analysis}
                          </div>
                          <div className="text-sm text-blue-900 bg-blue-50 p-4 rounded-lg border border-blue-100">
                              <span className="font-semibold block mb-2 text-blue-800 uppercase text-xs tracking-wider">Better Approach</span>
                              {item.improvement}
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </Card>
    </div>
  );
};

export default FeedbackView;
