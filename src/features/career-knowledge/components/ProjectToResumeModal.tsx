import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, ArrowRight, Loader2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { careerKnowledgeAppService } from '@/services/careerKnowledge/careerKnowledgeAppService';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import type { CareerFactCategory } from '@/types/careerKnowledge';

interface ProjectToResumeModalProps {
  profileId: string;
  isOpen: boolean;
  onClose: () => void;
  confirmedCount: number;
}

const CATEGORIES: { key: CareerFactCategory; label: string }[] = [
  { key: 'experience', label: 'Work Experience' },
  { key: 'education', label: 'Education' },
  { key: 'skill', label: 'Skills' },
  { key: 'project', label: 'Projects' },
  { key: 'achievement', label: 'Awards & Achievements' },
];

export const ProjectToResumeModal: React.FC<ProjectToResumeModalProps> = ({
  profileId,
  isOpen,
  onClose,
  confirmedCount,
}) => {
  const navigate = useNavigate();
  const [resumeTitle, setResumeTitle] = useState('Career Knowledge Export');
  const [selectedCategories, setSelectedCategories] = useState<CareerFactCategory[]>([
    'experience',
    'education',
    'skill',
    'project',
    'achievement',
  ]);
  const [projecting, setProjecting] = useState(false);

  if (!isOpen) return null;

  const toggleCategory = (cat: CareerFactCategory) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleProject = async () => {
    if (confirmedCount === 0) {
      toast.error('No confirmed career facts to project. Please confirm candidate facts first.');
      return;
    }

    setProjecting(true);
    try {
      const projection = await careerKnowledgeAppService.projectToResume(
        profileId,
        undefined,
        selectedCategories
      );

      const newResumeId = await db.resumes.add({
        fileName: resumeTitle.trim() || 'Projected Resume',
        rawText: '',
        parsedData: projection.resumeData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      toast.success(
        `Resume created with ${projection.attributions.length} attributed entries from Career Knowledge.`
      );

      onClose();
      navigate(`/resumes/${newResumeId}/edit`);
    } catch (err) {
      toast.error('Projection failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProjecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
            Project to Resume
          </DialogTitle>
          <DialogDescription>
            Generate an attributed Resume presentation from your confirmed Career Knowledge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="resume-title" className="text-xs font-semibold text-foreground">
              New Resume Name
            </label>
            <Input
              id="resume-title"
              value={resumeTitle}
              onChange={(e) => setResumeTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer CV"
              disabled={projecting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Include Categories
            </label>
            <div className="space-y-2 border border-border p-3 rounded-lg bg-card">
              {CATEGORIES.map((cat) => (
                <div key={cat.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${cat.key}`}
                    checked={selectedCategories.includes(cat.key)}
                    onCheckedChange={() => toggleCategory(cat.key)}
                    disabled={projecting}
                  />
                  <label
                    htmlFor={`cat-${cat.key}`}
                    className="text-xs font-medium text-foreground cursor-pointer"
                  >
                    {cat.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs space-y-1">
            <div className="font-semibold text-primary flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" aria-hidden="true" /> Canonical Knowledge Invariant
            </div>
            <div className="text-muted-foreground">
              Career Knowledge is the canonical truth. Resumes are one-way projections with
              back-links to source facts.
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={projecting}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleProject}
            disabled={selectedCategories.length === 0 || projecting || confirmedCount === 0}
            className="gap-1.5"
          >
            {projecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Projecting...
              </>
            ) : (
              <>
                Project & Edit Resume <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
