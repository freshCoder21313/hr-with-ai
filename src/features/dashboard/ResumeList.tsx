import React, { useState } from 'react';
import { Resume } from '@/types';
import { FileText, Trash2, Check, Clock, Edit, Wand2, Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { GitHubImportModal } from '@/features/resume-builder/github-import/GitHubImportModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ResumeListProps {
  resumes: Resume[];
  selectedResumeId?: number;
  onSelect: (resume: Resume) => void;
  onDelete: (id: number) => void;
  onTailor?: (resume: Resume) => void;
  onToggleMain?: (resume: Resume) => void;
  onRefresh?: () => void;
}

const ResumeList: React.FC<ResumeListProps> = ({
  resumes,
  selectedResumeId,
  onSelect,
  onDelete,
  onTailor,
  onToggleMain,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  if (resumes.length === 0) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  return (
    <div className="space-y-3 mt-4">
      <h3 className="text-sm font-medium text-foreground">Saved Resumes</h3>

      <div className="border rounded-md bg-muted/50 p-2 max-h-[200px] overflow-y-auto space-y-2 border-border">
        {resumes.map((resume) => (
          <div
            key={resume.id}
            className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
              selectedResumeId === resume.id
                ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/20'
                : 'bg-card border-border hover:border-primary/20 hover:bg-muted'
            }`}
            onClick={() => onSelect(resume)}
          >
            <div className="flex items-start gap-3 overflow-hidden">
              <div
                className={`mt-1 p-1.5 rounded-full ${selectedResumeId === resume.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
              >
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${selectedResumeId === resume.id ? 'text-primary' : 'text-foreground'}`}
                >
                  {resume.fileName || 'Untitled Resume'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(resume.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2">
              {/* Main CV Toggle */}
              {onToggleMain && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${resume.isMain ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10' : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleMain(resume);
                      }}
                    >
                      <Star className="w-4 h-4" fill={resume.isMain ? 'currentColor' : 'none'} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{resume.isMain ? 'This is your Main CV' : 'Mark as Main CV'}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Main CV Actions */}
              {resume.isMain && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate('/cv-chat');
                      }}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Chat with AI to Update</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {onTailor && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onTailor(resume);
                      }}
                    >
                      <Wand2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tailor to Job</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={(e) => {
                      e.preventDefault(); // Prevent form submission
                      e.stopPropagation();
                      if (resume.id) navigate(`/resumes/${resume.id}/edit`);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit Resume</p>
                </TooltipContent>
              </Tooltip>
              {selectedResumeId === resume.id && <Check className="w-4 h-4 text-primary" />}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.preventDefault(); // Prevent form submission
                      e.stopPropagation();
                      if (resume.id) onDelete(resume.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete Resume</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>

      <GitHubImportModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onImportComplete={onRefresh}
      />
    </div>
  );
};

export default ResumeList;
