import React, { useState, useEffect } from 'react';
import { subscribeToApiKeyModal } from '@/events/apiKeyEvents';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI Provider Profiles</DialogTitle>
          <DialogDescription>
            Manage your AI service providers, API keys, and fallback sequence.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-[400px]">
          <AIProviderProfilesEditor onSave={() => setIsOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyModal;
