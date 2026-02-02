import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import mermaid from 'mermaid';
import { db } from '@/lib/db';
import { generateInterviewFeedback, getStoredAIConfig } from '@/services/geminiService';
import { Interview, InterviewFeedback } from '@/types';
import {
  CheckCircle2,
  AlertCircle,
  BarChart2,
  BookOpen,
  ExternalLink,
  Loader2,
  Zap,
  Building2,
  Medal,
  MessageSquare,
  FileText,
  Printer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChatArea, AnalysisItem } from './components/ChatArea';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

const FeedbackView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analysis');
  const [analysisMap, setAnalysisMap] = useState<Record<number, AnalysisItem>>({});
  const mermaidRef1 = useRef<HTMLDivElement>(null);
  const mermaidRef2 = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
  }, []);

  useEffect(() => {
    if (interview?.messages && feedback?.keyQuestionAnalysis) {
      const map: Record<number, AnalysisItem> = {};

      feedback.keyQuestionAnalysis.forEach((analysisItem) => {
        // Simple logic: Find the model message that *contains* the question text
        // Then find the immediate next user message.
        // That user message is what we attach the feedback to.

        // Clean up question text for better matching (remove newlines, extra spaces)
        const cleanQuestion = analysisItem.question.trim().substring(0, 50); // Match first 50 chars

        for (let i = 0; i < interview.messages.length - 1; i++) {
          const msg = interview.messages[i];
          if (msg.role === 'model' && msg.content.includes(cleanQuestion)) {
            // Found the question. The answer should be i + 1
            const nextMsg = interview.messages[i + 1];
            if (nextMsg && nextMsg.role === 'user') {
              map[i + 1] = analysisItem;
              break; // Found the match for this analysis item
            }
          }
        }
      });
      setAnalysisMap(map);
    }
  }, [interview, feedback]);

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
      if (
        feedback &&
        !loading &&
        mermaidRef1.current &&
        mermaidRef2.current &&
        activeTab === 'analysis'
      ) {
        try {
          mermaidRef1.current.innerHTML = '';
          mermaidRef2.current.innerHTML = '';

          const { svg: svg1 } = await mermaid.render(
            'mermaid-chart-1',
            feedback.mermaidGraphCurrent
          );
          mermaidRef1.current.innerHTML = svg1;

          const { svg: svg2 } = await mermaid.render(
            'mermaid-chart-2',
            feedback.mermaidGraphPotential
          );
          mermaidRef2.current.innerHTML = svg2;
        } catch (error) {
          console.error('Mermaid rendering failed:', error);
          if (mermaidRef1.current)
            mermaidRef1.current.innerHTML =
              '<p class="text-red-500 text-sm">Error rendering chart</p>';
        }
      }
    };
    renderCharts();
  }, [feedback, loading, activeTab]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
        <p className="text-slate-600 font-medium text-lg">AI is analyzing your performance...</p>
        <p className="text-slate-400">Generating comprehensive report & visualization</p>
      </div>
    );
  }

  if (!feedback || !interview)
    return <div className="p-8 text-center text-red-500">Error loading feedback</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 p-6 md:p-8">
      {/* Tabs Header */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="analysis" className="gap-2">
              <BarChart2 className="w-4 h-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="transcript" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Transcript
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            Save as PDF
          </Button>
        </div>

        <TabsContent
          value="analysis"
          className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {/* Score Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-md bg-white md:col-span-2">
              <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 p-8">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Interview Analysis</h1>
                  <p className="text-slate-500 text-lg">
                    {interview.jobTitle} @ {interview.company}
                  </p>

                  <div className="flex gap-2 mt-4 flex-wrap">
                    {(feedback.badges || []).map((badge, idx) => (
                      <div
                        key={idx}
                        className="flex items-center px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200"
                      >
                        <Medal className="w-3 h-3 mr-1" />
                        {badge}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">
                      Overall Score
                    </p>
                  </div>
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center border-[6px] text-3xl font-bold shadow-sm
                        ${
                          feedback.score >= 8
                            ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                            : feedback.score >= 6
                              ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                              : 'border-red-500 text-red-600 bg-red-50'
                        }`}
                  >
                    {feedback.score}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New Metrics: Resilience & Culture Fit */}
            <Card className="flex flex-col justify-center gap-4 p-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-500" /> Resilience
                  </span>
                  <span className="text-purple-700">{feedback.resilienceScore || 'N/A'}/10</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{ width: `${(feedback.resilienceScore || 0) * 10}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" /> Culture Fit
                  </span>
                  <span className="text-blue-700">{feedback.cultureFitScore || 'N/A'}/10</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${(feedback.cultureFitScore || 0) * 10}%` }}
                  ></div>
                </div>
              </div>

              {/* Radar Chart (Mini) */}
              <div className="h-[150px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    data={[
                      { subject: 'Technical', A: feedback.score, fullMark: 10 },
                      { subject: 'Culture', A: feedback.cultureFitScore || 5, fullMark: 10 },
                      { subject: 'Resilience', A: feedback.resilienceScore || 5, fullMark: 10 },
                      { subject: 'Comm', A: feedback.score * 0.9, fullMark: 10 }, // Placeholder logic
                      {
                        subject: 'Problem Solving',
                        A: feedback.score * 1.1 > 10 ? 10 : feedback.score * 1.1,
                        fullMark: 10,
                      },
                    ]}
                  >
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                    <Radar
                      name="Candidate"
                      dataKey="A"
                      stroke="#2563eb"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

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
                <div
                  ref={mermaidRef1}
                  className="overflow-x-auto flex justify-center py-4 bg-slate-50/50 rounded-lg min-h-[200px] items-center"
                ></div>
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
                <div
                  ref={mermaidRef2}
                  className="overflow-x-auto flex justify-center py-4 bg-slate-50/50 rounded-lg min-h-[200px] items-center"
                ></div>
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
                        <ExternalLink
                          size={14}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
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
                      <span className="font-semibold block mb-2 text-slate-900 uppercase text-xs tracking-wider">
                        Analysis
                      </span>
                      {item.analysis}
                    </div>
                    <div className="text-sm text-blue-900 bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <span className="font-semibold block mb-2 text-blue-800 uppercase text-xs tracking-wider">
                        Better Approach
                      </span>
                      {item.improvement}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="transcript" className="h-[calc(100vh-200px)] min-h-[500px]">
          <Card className="h-full border-none shadow-md overflow-hidden flex flex-col">
            <CardHeader className="border-b bg-white py-4 shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-slate-500" />
                Review Transcript
              </CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <ChatArea messages={interview.messages} analysisMap={analysisMap} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackView;
