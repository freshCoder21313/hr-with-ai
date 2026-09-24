import { Resume, Message } from '@/types';
import { ProposedChange } from '../utils/cvChatUtils';
import { Job } from '../stores/useJobStore';
import { ChatArea } from '@/features/interview/components/ChatArea';
import { SimpleInputArea } from '@/components/shared/SimpleInputArea';
import { ChangeReviewCard } from './ChangeReviewCard';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';
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
} from 'lucide-react';

interface CVChatPanelProps {
  messages: Message[];
  isTyping: boolean;
  mainCV: Resume | null;
  chatResumeId: number | undefined;
  pendingChanges: ProposedChange[] | null;
  resumes: Resume[];
  contextResumeId: number | undefined;
  contextJobId: string | undefined;
  jobs: Job[];
  onSendMessage: (text: string, image?: string) => void;
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
  mainCV,
  chatResumeId,
  pendingChanges,
  resumes,
  contextResumeId,
  contextJobId,
  jobs,
  onSendMessage,
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

  return (
    <div className="flex flex-col border-r border-border bg-background overflow-hidden w-full md:w-[38%] md:min-w-[280px]">
      <div className="h-12 px-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Chat Assistant</span>
        </div>
        <div className="flex items-center gap-1.5">
          {pendingChanges && (
            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full animate-pulse shrink-0">
              {pendingChanges.length} pending
            </span>
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
                className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                onClick={onDeleteCV}
                disabled={!chatResumeId}
              >
                <Trash2 size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Current CV</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={onGitHubImportOpen}
              >
                <Github size={12} /> Import
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
              className="w-full pl-7 pr-8 py-1 text-[11px] font-medium border border-border bg-background rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer transition-all hover:border-primary/30"
              value={chatResumeId ?? ''}
              onChange={(e) => onChatCVChange(Number(e.target.value))}
              title="Select CV to Edit"
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
                className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100 hover:bg-primary/10"
                onClick={() => {
                  if (!chatResumeId) return;
                  setRenameValue(resumes.find((r) => r.id === chatResumeId)?.fileName || '');
                  setRenameOpen(true);
                }}
                disabled={!chatResumeId}
              >
                <Pencil size={12} className="text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rename CV</TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative flex items-center group">
            <div className="absolute left-2 text-amber-500 opacity-60 group-focus-within:opacity-100 transition-opacity">
              <FileSearch size={11} />
            </div>
            <select
              className="w-full pl-6 pr-6 py-1 text-[10px] border border-border/60 bg-background/50 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 appearance-none cursor-pointer transition-all hover:bg-background"
              value={contextResumeId ?? ''}
              onChange={(e) =>
                onSetContextResumeId(e.target.value ? Number(e.target.value) : undefined)
              }
              title="Reference CV Context"
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
            <ChevronDown
              size={9}
              className="absolute right-2 text-muted-foreground pointer-events-none opacity-40"
            />
          </div>

          <div className="relative flex items-center group">
            <div className="absolute left-2 text-emerald-500 opacity-60 group-focus-within:opacity-100 transition-opacity">
              <Target size={11} />
            </div>
            <select
              className="w-full pl-6 pr-6 py-1 text-[10px] border border-border/60 bg-background/50 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400 appearance-none cursor-pointer transition-all hover:bg-background"
              value={contextJobId ?? ''}
              onChange={(e) => onSetContextJobId(e.target.value || undefined)}
              title="Target Job Context"
            >
              <option value="">No Target Job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title || j.company || 'Job'}
                </option>
              ))}
            </select>
            <ChevronDown
              size={9}
              className="absolute right-2 text-muted-foreground pointer-events-none opacity-40"
            />
          </div>
        </div>
      </div>

      <ChatArea messages={messages} isProcessing={isTyping} />

      {pendingChanges && pendingChanges.length > 0 && (
        <div className="border-t border-border bg-amber-500/5 p-3 space-y-2 max-h-48 overflow-y-auto shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
            <AlertCircle size={13} />
            <span>Proposed Changes \u2014 review before accepting</span>
          </div>
          {pendingChanges.map((change, idx) => (
            <ChangeReviewCard
              key={idx}
              change={change}
              onAccept={() => onAcceptChange(change)}
              onReject={() => onRejectChange(change)}
            />
          ))}
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
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
            }}
            placeholder="Enter new CV name"
            autoFocus
          />
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
