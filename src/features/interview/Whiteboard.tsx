import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import tldrawAssets from './tldrawAssets.json';

interface WhiteboardProps {
  initialData?: string;
  onChange: (data: string) => void;
  onMount?: (editor: Editor) => void;
  readOnly?: boolean;
}

// Debounce helper
const useDebouncedCallback = (callback: (...args: any[]) => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
};

const Whiteboard: React.FC<WhiteboardProps> = ({
  initialData,
  onChange,
  onMount,
  readOnly = false,
}) => {
  const [editor, setEditor] = useState<Editor | null>(null);
  const isInitialLoad = useRef(true);

  // Debounce the save to DB to avoid performance hits
  const debouncedOnChange = useDebouncedCallback((snapshot: any) => {
    onChange(JSON.stringify(snapshot));
  }, 1000);

  const handleMount = (editorInstance: Editor) => {
    setEditor(editorInstance);
    if (onMount) onMount(editorInstance);

    // Load initial data if provided and it's the first mount
    if (initialData && isInitialLoad.current) {
      try {
        const snapshot = JSON.parse(initialData);
        editorInstance.store.loadSnapshot(snapshot);
      } catch (e) {
        console.error('Failed to load whiteboard data', e);
      }
      isInitialLoad.current = false;
    }

    // Set read-only if required
    if (readOnly) {
      editorInstance.updateInstanceState({ isReadonly: true });
    }

    // Listen for changes
    const cleanup = editorInstance.store.listen((entry) => {
      // We only care if document records change (shapes, bindings, etc), not ui state like pointer
      if (entry.source === 'user') {
        const snapshot = editorInstance.store.getSnapshot();
        debouncedOnChange(snapshot);
      }
    });

    return () => cleanup();
  };

  // If initialData changes externally (unlikely in this flow, but good practice), update store?
  // In our app, initialData is usually just for the first load.
  // We'll skip complex sync logic here to avoid overwriting user work.

  return (
    <div className="tldraw-container relative w-full h-full border-0 bg-slate-50">
      <Tldraw
        persistenceKey={null} // Disable internal persistence to avoid conflicts with our DB
        onMount={handleMount}
        hideUi={readOnly} // Hide UI if reviewing history
        overrides={{
          // Customize the UI to remove unnecessary menu items
          actions: (editor, actions) => {
            const newActions = { ...actions };
            // Remove file operations since we handle saving
            delete newActions['open-file'];
            delete newActions['save-to-json'];
            delete newActions['export-as-svg'];
            delete newActions['export-as-png'];
            return newActions;
          },
        }}
        assetUrls={tldrawAssets}
      />
    </div>
  );
};

export default Whiteboard;
