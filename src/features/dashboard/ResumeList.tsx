import React from 'react';
import { Resume } from '@/types';
import { FileText, Trash2, Check, Clock, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ResumeListProps {
  resumes: Resume[];
  selectedResumeId?: number;
  onSelect: (resume: Resume) => void;
  onDelete: (id: number) => void;
}

const ResumeList: React.FC<ResumeListProps> = ({ 
  resumes, 
  selectedResumeId, 
  onSelect, 
  onDelete 
}) => {
  const navigate = useNavigate();

  if (resumes.length === 0) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <div className="space-y-3 mt-4">
      <h3 className="text-sm font-medium text-slate-700">Saved Resumes</h3>
      <div className="border rounded-md bg-slate-50 p-2 max-h-[200px] overflow-y-auto space-y-2">
        {resumes.map((resume) => (
            <div 
              key={resume.id} 
              className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                selectedResumeId === resume.id 
                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' 
                  : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
              }`}
              onClick={() => onSelect(resume)}
            >
              <div className="flex items-start gap-3 overflow-hidden">
                <div className={`mt-1 p-1.5 rounded-full ${selectedResumeId === resume.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${selectedResumeId === resume.id ? 'text-blue-700' : 'text-slate-700'}`}>
                    {resume.fileName || 'Untitled Resume'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {formatDate(resume.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                  onClick={(e) => {
                    e.preventDefault(); // Prevent form submission
                    e.stopPropagation();
                    if (resume.id) navigate(`/resumes/${resume.id}/edit`);
                  }}
                  title="Edit Resume"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                {selectedResumeId === resume.id && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.preventDefault(); // Prevent form submission
                    e.stopPropagation();
                    if (resume.id) onDelete(resume.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default ResumeList;
