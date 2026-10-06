import React, { Suspense } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Code2, PenTool, X } from 'lucide-react';
import type { Editor } from 'tldraw';

// Lazy load components
const CodeEditor = React.lazy(() => import('@/features/interview/CodeEditor'));
const Whiteboard = React.lazy(() => import('@/features/interview/Whiteboard'));

interface ToolModalsProps {
  isCodeOpen: boolean;
  setIsCodeOpen: (open: boolean) => void;
  isWhiteboardOpen: boolean;
  setIsWhiteboardOpen: (open: boolean) => void;
  currentCode: string;
  updateCode: (val: string) => void;
  whiteboardData: string;
  onWhiteboardMount: (editor: Editor) => void;
  updateWhiteboard: (data: string) => void;
  onSubmit: (type: 'code' | 'whiteboard') => void;
  isHardcore: boolean;
  isSubmitting: boolean;
}

export const ToolModals: React.FC<ToolModalsProps> = ({
  isCodeOpen,
  setIsCodeOpen,
  isWhiteboardOpen,
  setIsWhiteboardOpen,
  currentCode,
  updateCode,
  whiteboardData,
  onWhiteboardMount,
  updateWhiteboard,
  onSubmit,
  isHardcore,
  isSubmitting,
}) => {
  return (
    <>
      {/* Code Editor Modal */}
      <Dialog open={isCodeOpen} onOpenChange={setIsCodeOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[90dvh] max-sm:w-full max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none p-0 gap-0 bg-[#1e1e1e] border-slate-800 flex flex-col overflow-hidden pt-[var(--safe-top,0px)] [&>button]:hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/10 shrink-0">
            <DialogTitle className="text-white text-sm font-mono flex items-center gap-2">
              <Code2 size={16} /> Live Code Editor
            </DialogTitle>
            <DialogDescription className="sr-only">
              Write your solution in the editor, then submit it to the interviewer.
            </DialogDescription>
            <div className="flex items-center gap-2">
              <Button
                size="xs"
                className="bg-success text-success-foreground hover:bg-success/90 border-0"
                onClick={() => onSubmit('code')}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Submit Solution'}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground gap-2"
                aria-label="Close code editor"
                onClick={() => setIsCodeOpen(false)}
              >
                <X size={16} /> Close
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative w-full h-full">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading Editor...
                </div>
              }
            >
              <CodeEditor
                code={currentCode || ''}
                onChange={(val) => val !== undefined && updateCode(val)}
                isHardcore={isHardcore}
              />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>

      {/* Whiteboard Modal */}
      <Dialog open={isWhiteboardOpen} onOpenChange={setIsWhiteboardOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[90dvh] max-sm:w-full max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none p-0 gap-0 bg-background flex flex-col overflow-hidden border-border pt-[var(--safe-top,0px)] [&>button]:hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
            <DialogTitle className="text-foreground text-sm font-medium flex items-center gap-2">
              <PenTool size={16} /> Design Whiteboard
            </DialogTitle>
            <DialogDescription className="sr-only">
              Sketch your design on the canvas, then submit it to the interviewer.
            </DialogDescription>
            <div className="flex items-center gap-2">
              <Button
                size="xs"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => onSubmit('whiteboard')}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Submit Design'}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground gap-2"
                aria-label="Close whiteboard"
                onClick={() => setIsWhiteboardOpen(false)}
              >
                <X size={16} /> Close
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative bg-muted/30 w-full h-full">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading Whiteboard...
                </div>
              }
            >
              <Whiteboard
                initialData={whiteboardData}
                onMount={onWhiteboardMount}
                onChange={updateWhiteboard}
              />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
