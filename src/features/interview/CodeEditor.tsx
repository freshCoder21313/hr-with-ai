import React from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  onRun?: () => void;
  isRunning?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, language = 'javascript', onRun, isRunning }) => {
  return (
    <div className="h-full w-full border border-slate-700 rounded-xl overflow-hidden shadow-sm bg-[#1e1e1e] relative group">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={code}
        theme="vs-dark"
        onChange={onChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
        }}
      />
      
      {onRun && (
        <Button
          onClick={onRun}
          disabled={isRunning}
          variant="default" // Using default but overriding colors for 'Run' action usually green
          className="absolute bottom-4 right-4 z-10 gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg disabled:opacity-50"
        >
          {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
          Run Code
        </Button>
      )}
    </div>
  );
};

export default CodeEditor;
