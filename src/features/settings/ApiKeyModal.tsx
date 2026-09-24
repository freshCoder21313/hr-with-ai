import React, { useState, useEffect } from 'react';
import { subscribeToApiKeyModal } from '@/events/apiKeyEvents';
import { X } from 'lucide-react';
import { AIProviderProfilesEditor } from './AIProviderProfilesEditor';

const ApiKeyModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(() => {
    // Initial check: if no legacy key and no active profile, open modal
    const hasLegacyKey = !!localStorage.getItem('gemini_api_key');
    const hasActiveProfile = !!localStorage.getItem('ai_active_profile_id');
    return !hasLegacyKey && !hasActiveProfile;
  });

  useEffect(() => {
    // Subscribe to global open event
    const unsubscribe = subscribeToApiKeyModal(() => setIsOpen(true));

    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] border border-border text-card-foreground relative animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors z-10"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4 pr-8">
          <h2 className="text-xl font-bold text-foreground">AI Provider Profiles</h2>
          <p className="text-muted-foreground text-xs">
            Manage your AI service providers, API keys, and fallback sequence.
          </p>
        </div>

        <div className="flex-1 overflow-hidden min-h-[400px]">
          <AIProviderProfilesEditor onSave={() => setIsOpen(false)} />
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
