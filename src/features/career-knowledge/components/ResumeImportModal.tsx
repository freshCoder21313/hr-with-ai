import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight, CheckCircle2, Info, Loader2 } from 'lucide-react';
import type { Resume } from '@/types/resume';
import { careerKnowledgeAppService } from '@/services/careerKnowledge/careerKnowledgeAppService';
import type { MigrationPreview } from '@/services/careerKnowledge/migration';
import { toast } from 'sonner';

interface ResumeImportModalProps {
  profileId: string;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const ResumeImportModal: React.FC<ResumeImportModalProps> = ({
  profileId,
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setResumes([]);
      setSelectedResumeId(null);
      setPreview(null);
      return;
    }

    setLoading(true);
    careerKnowledgeAppService
      .listResumes()
      .then((list) => {
        setResumes(list);
        if (list.length > 0) {
          const firstId = list[0].id ?? null;
          setSelectedResumeId(firstId);
          if (firstId) {
            const p = careerKnowledgeAppService.previewResumeMigration(list[0], profileId);
            setPreview(p);
          }
        }
      })
      .catch((err) => {
        toast.error(
          'Failed to load resumes: ' + (err instanceof Error ? err.message : String(err))
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, profileId]);

  const handleSelectResume = (res: Resume) => {
    setSelectedResumeId(res.id ?? null);
    const p = careerKnowledgeAppService.previewResumeMigration(res, profileId);
    setPreview(p);
  };

  const handleImport = async () => {
    const target = resumes.find((r) => r.id === selectedResumeId);
    if (!target) return;

    setImporting(true);
    try {
      const result = await careerKnowledgeAppService.migrateResume(target, profileId);
      toast.success(
        `Imported ${result.createdFacts.length} candidate facts (${result.reusedFacts.length} already existed).`
      );
      onImportComplete();
      onClose();
    } catch (err) {
      toast.error('Migration failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Import Candidates from Resume
          </DialogTitle>
          <DialogDescription>
            Extract claims from existing Resumes into Career Knowledge candidates.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="py-8 flex items-center justify-center text-muted-foreground"
          >
            <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
            <span className="sr-only">Loading resumes...</span>
          </div>
        ) : resumes.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground space-y-2">
            <p>No local resumes found.</p>
            <p className="text-xs">Create or upload a resume first to extract candidates.</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Resume Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Resume
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {resumes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectResume(r)}
                    className={`w-full text-left p-3 rounded-lg border text-sm flex items-center justify-between transition-colors ${
                      selectedResumeId === r.id
                        ? 'border-primary bg-primary/5 text-primary font-semibold'
                        : 'border-border bg-card text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className="truncate">
                      <div>{r.fileName || `Resume #${r.id}`}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        {r.parsedData?.basics?.name || 'Unnamed candidate'} •{' '}
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {selectedResumeId === r.id && (
                      <CheckCircle2
                        className="w-4 h-4 text-primary shrink-0 ml-2"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Summary */}
            {preview && (
              <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Migration Preview
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-card border rounded">
                    <span className="text-muted-foreground">Extractable Facts:</span>{' '}
                    <strong className="text-foreground">{preview.facts.length}</strong>
                  </div>
                  <div className="p-2 bg-card border rounded">
                    <span className="text-muted-foreground">Deferred/Skipped:</span>{' '}
                    <strong className="text-foreground">{preview.skipped.length}</strong>
                  </div>
                </div>

                <div className="p-2.5 bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 rounded text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    Imported items enter <strong>Needs confirmation</strong>. They will not become
                    canonical facts until you explicitly confirm them.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleImport}
            disabled={!selectedResumeId || !preview || preview.facts.length === 0 || importing}
            className="gap-1.5"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Importing...
              </>
            ) : (
              <>
                Import Candidates <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
