import React, { useCallback, useEffect, useState } from 'react';
import { Tldraw, Editor, getSnapshot, loadSnapshot } from 'tldraw';

interface WhiteboardProps {
  initialData?: string;
  onChange: (data: string) => void;
  onMount?: (editor: Editor) => void;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ initialData, onChange, onMount }) => {
  const [editor, setEditor] = useState<Editor | null>(null);

  const handleMount = (editorInstance: Editor) => {
    setEditor(editorInstance);
    if (onMount) onMount(editorInstance);

    if (initialData) {
      try {
        const snapshot = JSON.parse(initialData);
        loadSnapshot(editorInstance.store, snapshot);
      } catch (e) {
        console.error("Failed to load whiteboard data", e);
      }
    }

    // Persist changes
    const cleanup = editorInstance.store.listen((entry) => {
        // Debounce or just save snapshot
        // We use a simple strategy: save snapshot on every change (might be heavy for very large boards, but ok for interview)
        // Optimization: In a real app, debounce this.
        const snapshot = getSnapshot(editorInstance.store);
        onChange(JSON.stringify(snapshot));
    });

    return () => cleanup();
  };

  return (
    <div className="tldraw-container relative w-full h-full border border-slate-200 rounded-xl overflow-hidden shadow-sm">
       <Tldraw 
        persistenceKey="hr-with-ai-whiteboard-temp" // Temporary local persistence
        onMount={handleMount}
        hideUi={false}
       />
    </div>
  );
};

export default Whiteboard;