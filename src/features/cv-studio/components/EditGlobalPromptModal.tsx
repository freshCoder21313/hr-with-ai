import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EditGlobalPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
  onSave: (newPrompt: string) => void;
}

const PromptEditor: React.FC<{
  initialPrompt: string;
  onSave: (p: string) => void;
  onClose: () => void;
}> = ({ initialPrompt, onSave, onClose }) => {
  const [prompt, setPrompt] = useState(initialPrompt);

  const handleSave = () => {
    onSave(prompt);
    onClose();
  };

  return (
    <>
      <div className="grid gap-4 py-4">
        <div className="grid w-full gap-1.5">
          <Label htmlFor="global-prompt">Global AI Prompt</Label>
          <Textarea
            id="global-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[250px] font-mono text-sm"
            placeholder="Enter your global prompt here..."
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </DialogFooter>
    </>
  );
};

export const EditGlobalPromptModal: React.FC<EditGlobalPromptModalProps> = ({
  isOpen,
  onClose,
  currentPrompt,
  onSave,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Global Prompt</DialogTitle>
          <DialogDescription>
            This prompt provides general instructions to the AI for all jobs processed in a batch.
          </DialogDescription>
        </DialogHeader>
        {/* Remount on open so the editor always starts from the current prompt. */}
        <PromptEditor
          key={isOpen ? 'open' : 'closed'}
          initialPrompt={currentPrompt}
          onSave={onSave}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};
