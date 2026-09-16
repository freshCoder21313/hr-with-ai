import React from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { UserSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAIProviderEditor } from './useAIProviderEditor';
import { ProfileList } from './ProfileList';
import { ProfileEditor } from './ProfileEditor';

interface AIProviderProfilesEditorProps {
  onSave?: (settings: UserSettings) => void;
  className?: string;
}

export const AIProviderProfilesEditor: React.FC<AIProviderProfilesEditorProps> = ({
  onSave,
  className,
}) => {
  const {
    settings,
    editingProfileId,
    setEditingProfileId,
    isTesting,
    fetchingModels,
    fetchedModels,
    isSaving,
    profiles,
    activeId,
    fallbackIds,
    editingProfile,
    handleAddProfile,
    handleDuplicateProfile,
    handleDeleteProfile,
    handleSetActive,
    handleUpdateProfile,
    handleReorderFallback,
    handleToggleFallback,
    handleTestConnection,
    handleFetchModels,
    handleAddModels,
    handleSave,
  } = useAIProviderEditor(onSave);

  if (!settings) return <div className="p-8 text-center">Loading profiles...</div>;

  return (
    <div className={cn('flex flex-col h-full space-y-4', className)}>
      <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
        {/* Left Side: Profile List */}
        <ProfileList
          profiles={profiles}
          editingProfileId={editingProfileId}
          activeId={activeId}
          fallbackIds={fallbackIds}
          onSelectProfile={setEditingProfileId}
          onAddProfile={handleAddProfile}
          onDuplicateProfile={handleDuplicateProfile}
          onDeleteProfile={handleDeleteProfile}
          onReorderFallback={handleReorderFallback}
          onToggleFallback={handleToggleFallback}
        />

        {/* Right Side: Editor */}
        <div className="flex-1 overflow-y-auto pr-2">
          {editingProfile ? (
            <ProfileEditor
              profile={editingProfile}
              activeId={activeId}
              fallbackIds={fallbackIds}
              isTesting={isTesting === editingProfile.id}
              isFetchingModels={fetchingModels[editingProfile.id]}
              fetchedModels={fetchedModels[editingProfile.id]}
              onUpdateProfile={handleUpdateProfile}
              onSetActive={handleSetActive}
              onTestConnection={handleTestConnection}
              onFetchModels={handleFetchModels}
              onAddModels={handleAddModels}
              onToggleFallback={handleToggleFallback}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground italic">
              Select or add a profile to start editing.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Alert className="flex-1 py-2 bg-primary/5 border-primary/10">
          <ShieldCheck className="h-3 w-3 text-primary" />
          <AlertDescription className="text-[10px] leading-tight">
            Keys stay <strong>on this device</strong>. They are sent only to the configured Base
            URLs.
          </AlertDescription>
        </Alert>
        <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
          {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : 'Save All'}
        </Button>
      </div>
    </div>
  );
};
