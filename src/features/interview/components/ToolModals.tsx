import React, { Suspense } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Code2, PenTool, X } from 'lucide-react';
// import { Editor } from 'tldraw'; // Removed direct import to avoid typing issues if not needed here

// Lazy load components
const CodeEditor = React.lazy(() => import('../CodeEditor'));
const Whiteboard = React.lazy(() => import('../Whiteboard'));

interface ToolModalsProps {
  isCodeOpen: boolean;
  setIsCodeOpen: (open: boolean) => void;
  isWhiteboardOpen: boolean;
  setIsWhiteboardOpen: (open: boolean) => void;
  currentCode: string;
  updateCode: (val: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  whiteboardData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onWhiteboardMount: (editor: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateWhiteboard: (data: any) => void;
  handleRunCode: () => void;
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
  handleRunCode,
  onSubmit,
  isHardcore,
  isSubmitting,
}) => {
  return (
    <>
      {/* Code Editor Modal */}
      <Dialog open={isCodeOpen} onOpenChange={setIsCodeOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 gap-0 bg-[#1e1e1e] border-slate-800 flex flex-col overflow-hidden [&>button]:hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/10 shrink-0">
            <DialogTitle className="text-white text-sm font-mono flex items-center gap-2">
              <Code2 size={16} /> Live Code Editor
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 bg-green-600 hover:bg-green-700 text-white border-0"
                onClick={() => onSubmit('code')}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Submit Solution'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-slate-400 hover:text-white gap-2"
                onClick={() => setIsCodeOpen(false)}
              >
                <X size={16} /> Close
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative w-full h-full">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full text-slate-500">
                  Loading Editor...
                </div>
              }
            >
              <CodeEditor
                code={currentCode || ''}
                onChange={(val) => val !== undefined && updateCode(val)}
                onRun={handleRunCode}
                isRunning={false}
                isHardcore={isHardcore}
              />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>

      {/* Whiteboard Modal */}
      <Dialog open={isWhiteboardOpen} onOpenChange={setIsWhiteboardOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 gap-0 bg-background flex flex-col overflow-hidden border-border [&>button]:hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
            <DialogTitle className="text-foreground text-sm font-medium flex items-center gap-2">
              <PenTool size={16} /> Design Whiteboard
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => onSubmit('whiteboard')}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Submit Design'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-muted-foreground hover:text-foreground gap-2"
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
