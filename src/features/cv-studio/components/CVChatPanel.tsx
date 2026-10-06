import { Resume, Message } from '@/types';
import { ProposedChange } from '../utils/cvChatUtils';
import { InteractiveQuestion, InteractiveQuestionGroup } from '@/services/ai/schemas';
import { Job } from '../stores/useJobStore';
import { ChatArea } from '@/features/interview/components/ChatArea';
import { SimpleInputArea } from '@/components/shared/SimpleInputArea';
import { ChangeReviewCard } from './ChangeReviewCard';
import {
  InteractiveQuestionCard,
  InteractiveQuestionAnswer,
  InteractiveQuestionAnswers,
} from './InteractiveQuestionCard';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Plus,
  Trash2,
  Github,
  FileEdit,
  Pencil,
  FileSearch,
  Target,
  ChevronDown,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

interface CVChatPanelProps {
  messages: Message[];
  isTyping: boolean;
  canRetry?: boolean;
  mainCV: Resume | null;
  chatResumeId: number | undefined;
  pendingChanges: ProposedChange[] | null;
  pendingChangeId: string | null;
  activeQuestionGroup?: InteractiveQuestionGroup | null;
  activeQuestion?: InteractiveQuestion | null;
  resumes: Resume[];
  contextResumeId: number | undefined;
  contextJobId: string | undefined;
  jobs: Job[];
  candidateFactCount?: number;
  onOpenCareerKnowledge?: () => void;
  onSendMessage: (text: string, image?: string) => void;
  onRetryLastResponse?: () => void;
  onAnswerQuestionGroup?: (
    group: InteractiveQuestionGroup,
    answers: InteractiveQuestionAnswers
  ) => void;
  onAnswerQuestion?: (question: InteractiveQuestion, answer: InteractiveQuestionAnswer) => void;
  onSkipQuestion?: () => void;
  onAcceptChange: (change: ProposedChange) => Promise<void>;
  onRejectChange: (change: ProposedChange) => void;
  onChatCVChange: (id: number) => void;
  onRenameCV: (id: number, newName: string) => void;
  onDeleteCV: () => void;
  onCreateNewCV: () => void;
  onSetContextResumeId: (id: number | undefined) => void;
  onSetContextJobId: (id: string | undefined) => void;
  onGitHubImportOpen: () => void;
}

export const CVChatPanel: React.FC<CVChatPanelProps> = ({
  messages,
  isTyping,
  canRetry,
  mainCV,
  chatResumeId,
  pendingChanges,
  pendingChangeId,
  activeQuestionGroup,
  activeQuestion,
  resumes,
  contextResumeId,
  contextJobId,
  jobs,
  candidateFactCount,
  onOpenCareerKnowledge,
  onSendMessage,
  onRetryLastResponse,
  onAnswerQuestionGroup,
  onAnswerQuestion,
  onSkipQuestion,
  onAcceptChange,
  onRejectChange,
  onChatCVChange,
  onRenameCV,
  onDeleteCV,
  onCreateNewCV,
  onSetContextResumeId,
  onSetContextJobId,
  onGitHubImportOpen,
}) => {
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (chatResumeId && trimmed) {
      onRenameCV(chatResumeId, trimmed);
    }
    setRenameOpen(false);
  };

  const currentGroup = activeQuestionGroup
    ? activeQuestionGroup
    : activeQuestion
      ? {
          id: activeQuestion.id,
          questions: [activeQuestion],
          submitLabel: activeQuestion.submitLabel,
        }
      : null;

  return (
    <div className="flex flex-col border-r border-border bg-background overflow-hidden w-full md:w-[38%] md:min-w-[280px]">
      <div className="h-12 px-3 sm:px-4 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm truncate">Chat Assistant</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {pendingChanges && (
            <span className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full animate-pulse shrink-0 font-medium">
              {pendingChanges.length} pending
            </span>
          )}
          {onOpenCareerKnowledge && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 relative font-medium text-foreground hover:text-primary hover:border-primary/40"
                  onClick={onOpenCareerKnowledge}
                  aria-label="Career Knowledge"
                >
                  <BookOpen size={12} className="text-primary" />
                  <span className="hidden sm:inline">Career Knowledge</span>
                  <span className="inline sm:hidden">Knowledge</span>
                  {candidateFactCount !== undefined && candidateFactCount > 0 && (
                    <Badge
                      variant="default"
                      className="px-1.5 py-0 text-[10px] h-4 bg-warning text-warning-foreground rounded-full font-bold ml-0.5"
                      aria-label={`${candidateFactCount} facts to review`}
                    >
                      {candidateFactCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open Career Knowledge Base & Review</TooltipContent>
            </Tooltip>
          )}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={onCreateNewCV}
              >
                <Plus size={12} /> New CV
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create Blank CV</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                onClick={onDeleteCV}
                aria-label="Delete current CV"
                disabled={!chatResumeId}
              >
                <Trash2 size={12} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Current CV</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={onGitHubImportOpen}
              >
                <Github size={12} aria-hidden="true" /> Import
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import GitHub Projects</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="border-b border-border bg-muted/10 p-2 space-y-2 shrink-0">
        <div className="relative flex items-center group gap-2">
          <div className="relative flex-1">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary opacity-60 group-focus-within:opacity-100 transition-opacity pointer-events-none">
              <FileEdit size={12} />
            </div>
            <select
              className="w-full min-h-10 rounded-md border border-border bg-background py-1 pl-7 pr-8 text-[11px] font-medium shadow-sm ring-offset-background transition-all hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:min-h-0 md:text-[11px] cursor-pointer appearance-none"
              value={chatResumeId ?? ''}
              onChange={(e) => onChatCVChange(Number(e.target.value))}
              aria-label="Select CV to edit"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.isMain ? '\u2605 ' : ''}
                  {r.fileName}
                </option>
              ))}
            </select>
            <ChevronDown
              size={10}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none opacity-50"
            />
          </div>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 opacity-60 hover:opacity-100 hover:bg-primary/10"
                onClick={() => {
                  if (!chatResumeId) return;
                  setRenameValue(resumes.find((r) => r.id === chatResumeId)?.fileName || '');
                  setRenameOpen(true);
                }}
                disabled={!chatResumeId}
                aria-label="Rename CV"
              >
                <Pencil size={12} className="text-primary" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rename CV</TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative flex items-center group">
            <div className="absolute left-2.5 text-warning opacity-70 group-focus-within:opacity-100 transition-opacity pointer-events-none">
              <FileSearch className="w-3.5 h-3.5" />
            </div>
            <select
              className="w-full h-10 min-h-10 pl-7 pr-6 text-base ring-offset-background border border-border/60 bg-background/50 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:h-9 md:text-xs appearance-none cursor-pointer transition-all hover:bg-background"
              value={contextResumeId ?? ''}
              onChange={(e) =>
                onSetContextResumeId(e.target.value ? Number(e.target.value) : undefined)
              }
              aria-label="Reference CV context"
            >
              <option value="">Auto Context (Main)</option>
              {resumes
                .filter((r) => r.id !== chatResumeId)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    Ref: {r.fileName}
                  </option>
                ))}
            </select>
            <ChevronDown className="absolute right-2 text-muted-foreground pointer-events-none opacity-40 w-3 h-3" />
          </div>

          <div className="relative flex items-center group">
            <div className="absolute left-2.5 text-success opacity-70 group-focus-within:opacity-100 transition-opacity pointer-events-none">
              <Target className="w-3.5 h-3.5" />
            </div>
            <select
              className="w-full h-10 min-h-10 pl-7 pr-6 text-base ring-offset-background border border-border/60 bg-background/50 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:h-9 md:text-xs appearance-none cursor-pointer transition-all hover:bg-background"
              value={contextJobId ?? ''}
              onChange={(e) => onSetContextJobId(e.target.value || undefined)}
              aria-label="Target job context"
            >
              <option value="">No Target Job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title || j.company || 'Job'}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 text-muted-foreground pointer-events-none opacity-40 w-3 h-3" />
          </div>
        </div>
      </div>

      <ChatArea
        messages={messages}
        isProcessing={isTyping}
        onRetry={canRetry ? onRetryLastResponse : undefined}
        onRegenerate={canRetry ? onRetryLastResponse : undefined}
      />

      {pendingChanges && pendingChanges.length > 0 && (
        <div className="border-t border-border bg-warning/5 p-3 space-y-2 max-h-48 overflow-y-auto shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-warning font-medium">
            <AlertCircle size={13} />
            <span>Proposed Changes — review before accepting</span>
          </div>
          {pendingChanges.map((change, idx) => {
            const sectionOldData = mainCV?.parsedData
              ? mainCV.parsedData[change.section]
              : undefined;
            const changeWithOldData =
              change.oldData !== undefined ? change : { ...change, oldData: sectionOldData };
            return (
              <ChangeReviewCard
                key={change.id || idx}
                change={changeWithOldData}
                onAccept={() => onAcceptChange(change)}
                onReject={() => onRejectChange(change)}
                isPending={pendingChangeId === change.id}
                isLocked={pendingChangeId !== null}
              />
            );
          })}
        </div>
      )}

      {currentGroup && !isTyping && (
        <div className="border-t border-border bg-primary/5 p-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <InteractiveQuestionCard
            questionGroup={currentGroup}
            onSubmit={(answers) => {
              if (onAnswerQuestionGroup) {
                onAnswerQuestionGroup(currentGroup, answers);
              } else if (onAnswerQuestion && currentGroup.questions[0]) {
                const firstQ = currentGroup.questions[0];
                onAnswerQuestion(firstQ, answers[firstQ.id] || { selectedOptions: [] });
              }
            }}
            onSkip={onSkipQuestion}
            disabled={isTyping}
          />
        </div>
      )}

      <SimpleInputArea
        onSendMessage={onSendMessage}
        disabled={isTyping || !mainCV}
        placeholder={
          mainCV
            ? "Ask AI to update your CV... (e.g. 'Add TypeScript to skills')"
            : 'No CV selected'
        }
      />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename CV</DialogTitle>
            <DialogDescription className="sr-only">
              Change the name of the selected CV
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="chat-cv-rename-input">CV Name</Label>
            <Input
              id="chat-cv-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameValue.trim()) handleRenameSubmit();
              }}
              placeholder="Enter new CV name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
