import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, language = 'javascript' }) => {
  return (
    <div className="h-full w-full border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-[#1e1e1e]">
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
    </div>
  );
};

export default CodeEditor;