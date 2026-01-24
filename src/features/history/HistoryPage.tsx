import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { Interview } from '@/types';
import { Calendar, Building, Briefcase, Download, Plus, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ProgressCharts from './ProgressCharts';

const HistoryPage: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      const allInterviews = await db.interviews.orderBy('createdAt').reverse().toArray();
      setInterviews(allInterviews);
    };
    fetchHistory();
  }, []);

  const handleExport = (interview: Interview, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(interview, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute(
      'download',
      `interview_${interview.company}_${new Date(interview.createdAt).toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Interview History</h1>
          <p className="text-slate-500 mt-1">Track your progress and review past sessions</p>
        </div>
        <Button onClick={() => navigate('/setup')} className="gap-2">
          <Plus size={16} />
          New Session
        </Button>
      </div>

      {/* Progress Charts Section */}
      {interviews.length > 0 && (
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ProgressCharts interviews={interviews} />
        </div>
      )}

      {interviews.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <Briefcase className="text-slate-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">No interviews recorded yet</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Start your first mock interview to get AI-powered feedback and improve your skills.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/setup')} className="mt-2">
              Start your first session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {interviews.map((interview) => (
            <Card
              key={interview.id}
              onClick={() =>
                navigate(
                  interview.status === 'completed'
                    ? `/feedback/${interview.id}`
                    : `/interview/${interview.id}`
                )
              }
              className="hover:shadow-md transition-all cursor-pointer group border-slate-200 hover:border-blue-300"
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between md:justify-start gap-4">
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {interview.company}
                      </h3>
                      {interview.feedback && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border
                                ${interview.feedback.score >= 8 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                        >
                          Score: {interview.feedback.score}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center text-slate-500 gap-4 text-sm">
                      <span className="flex items-center bg-slate-50 px-2 py-1 rounded">
                        <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                        {interview.jobTitle}
                      </span>
                      <span className="flex items-center bg-slate-50 px-2 py-1 rounded capitalize">
                        <Building className="w-3.5 h-3.5 mr-1.5" />
                        {interview.status.replace('_', ' ')}
                      </span>
                      <span className="flex items-center bg-slate-50 px-2 py-1 rounded">
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        {new Date(interview.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleExport(interview, e)}
                      className="text-slate-400 hover:text-blue-600 gap-1"
                    >
                      <Download size={14} />
                      Export
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-300 group-hover:text-blue-500 ml-auto md:ml-0"
                    >
                      <ArrowRight size={20} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
