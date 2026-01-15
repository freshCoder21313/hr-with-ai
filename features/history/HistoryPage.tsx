import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { Interview } from '@/types';
import { Calendar, Building, Briefcase, Download } from 'lucide-react';

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
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(interview, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `interview_${interview.company}_${new Date(interview.createdAt).toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Interview History</h1>
      </div>
      
      {interviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500 mb-4">No interviews recorded yet.</p>
          <button 
            onClick={() => navigate('/setup')}
            className="text-blue-600 font-medium hover:underline"
          >
            Start your first session
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {interviews.map((interview) => (
            <div 
              key={interview.id} 
              onClick={() => navigate(interview.status === 'completed' ? `/feedback/${interview.id}` : `/interview/${interview.id}`)}
              className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group relative"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {interview.company}
                  </h3>
                  <div className="flex items-center text-slate-500 mt-2 space-x-4 text-sm">
                    <span className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-1" />
                      {interview.jobTitle}
                    </span>
                    <span className="flex items-center">
                      <Building className="w-4 h-4 mr-1" />
                      {interview.status}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(interview.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    {interview.feedback && (
                    <div className={`px-3 py-1 rounded-full text-sm font-bold 
                        ${interview.feedback.score >= 8 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        Score: {interview.feedback.score}
                    </div>
                    )}
                    <button
                        onClick={(e) => handleExport(interview, e)}
                        className="flex items-center text-xs text-slate-400 hover:text-blue-600 transition-colors p-1"
                        title="Export JSON"
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Export
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;