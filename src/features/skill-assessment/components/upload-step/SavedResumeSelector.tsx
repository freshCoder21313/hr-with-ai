import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import ResumeList from '@/features/dashboard/ResumeList';
import { Resume } from '@/types';

interface SavedResumeSelectorProps {
  savedResumes: Resume[];
  selectedResumeId?: number;
  isLoading: boolean;
  onSelect: (id?: number) => void;
  onDelete: (id: number) => void;
  onToggleMain: (resume: Resume) => void;
  onRefresh: () => void;
  onAnalyzeSelected: () => void;
}

export const SavedResumeSelector: React.FC<SavedResumeSelectorProps> = ({
  savedResumes,
  selectedResumeId,
  isLoading,
  onSelect,
  onDelete,
  onToggleMain,
  onRefresh,
  onAnalyzeSelected,
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Saved Resumes
        </CardTitle>
        <CardDescription>Select an existing resume to reuse</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {savedResumes.length > 0 ? (
          <div className="space-y-4 flex-1 flex flex-col">
            <ResumeList
              resumes={savedResumes}
              selectedResumeId={selectedResumeId}
              onSelect={(r) => onSelect(r.id === selectedResumeId ? undefined : r.id)}
              onDelete={onDelete}
              onToggleMain={onToggleMain}
              onRefresh={onRefresh}
            />

            {selectedResumeId && (
              <div className="pt-6 mt-auto border-t">
                <LoadingButton
                  type="button"
                  onClick={onAnalyzeSelected}
                  disabled={isLoading}
                  isLoading={isLoading}
                  loadingText="Extracting Skills..."
                  className="w-full"
                  leftIcon={<Sparkles className="w-4 h-4 text-primary-foreground" />}
                >
                  Extract Skills from Selected CV
                </LoadingButton>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            <p className="text-sm">No saved resumes found.</p>
            <p className="text-xs mt-1">Upload a new one on the left to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
