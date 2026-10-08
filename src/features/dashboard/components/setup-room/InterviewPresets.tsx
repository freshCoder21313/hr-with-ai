import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Building,
  Briefcase,
  FileText,
  Target,
  ArrowRight,
  Eye,
  Edit3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface PresetItem {
  id: string;
  title: string;
  company: string;
  role: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'hardcore';
  type: 'standard' | 'coding' | 'system_design' | 'behavioral';
  mode: 'text' | 'voice' | 'hybrid';
  persona: string;
  tags: string[];
  description: string;
  jobDescription: string;
}

const INTERVIEW_PRESETS: PresetItem[] = [
  {
    id: 'google-fe',
    title: 'Google Senior Frontend',
    company: 'Google',
    role: 'Senior Frontend Engineer',
    difficulty: 'hard',
    type: 'coding',
    mode: 'hybrid',
    persona:
      'Alex, Senior Engineering Manager at Google. Thorough on web performance, DOM rendering, distributed state, and clean code.',
    tags: ['React & TS', 'Web Vitals', 'Coding'],
    description: 'DOM performance, component architecture, and modern TypeScript.',
    jobDescription:
      'Responsibilities:\n- Design and implement modular web components at scale.\n- Drive performance optimizations across Core Web Vitals.\n- Deep understanding of browser internals, async JavaScript, and robust state architecture.',
  },
  {
    id: 'amazon-star',
    title: 'Amazon Bar Raiser',
    company: 'Amazon',
    role: 'Software Development Engineer II',
    difficulty: 'hard',
    type: 'behavioral',
    mode: 'hybrid',
    persona:
      'Sarah, Principal Bar Raiser at Amazon. Strictly probes Customer Obsession, Ownership, and Bias for Action using the STAR method.',
    tags: ['STAR Method', 'Leadership', 'Behavioral'],
    description: 'Probing leadership principles, ownership, and conflict resolution.',
    jobDescription:
      'Responsibilities:\n- Deliver customer-facing distributed services with end-to-end ownership.\n- Champion operational excellence and bias for action.\n- Demonstrate clear situation, task, action, and measurable results (STAR).',
  },
  {
    id: 'system-design',
    title: 'Cloud & System Design',
    company: 'Tech Giant',
    role: 'Staff Systems Architect',
    difficulty: 'hardcore',
    type: 'system_design',
    mode: 'text',
    persona:
      'Marcus, Distinguished Systems Architect. Focuses on scalability, fault-tolerance, CAP theorem tradeoffs, and caching tiers.',
    tags: ['Distributed Systems', 'Caching', 'High Scale'],
    description: 'Microservices architecture, partitioning, CAP theorem, and 100k+ RPS.',
    jobDescription:
      'Responsibilities:\n- Architect highly available, resilient cloud systems.\n- Evaluate latency vs consistency tradeoffs across distributed storage tiers.\n- Design for horizontal scaling, disaster recovery, and data isolation.',
  },
  {
    id: 'hr-culture-screen',
    title: 'HR Screening & Culture Fit',
    company: 'TechCorp Global',
    role: 'Senior Software Engineer',
    difficulty: 'medium',
    type: 'behavioral',
    mode: 'hybrid',
    persona:
      'Elena, Senior Talent Acquisition Partner at TechCorp. Empathetic, perceptive, and focused on team culture, career motivations, cross-functional collaboration, and alignment with the JD.',
    tags: ['Culture Fit', 'HR Screen', 'Empathetic'],
    description: 'Empathetic yet sharp HR conversation evaluating team fit, career drivers, and JD alignment.',
    jobDescription:
      'Responsibilities:\n- Partner seamlessly with Product Managers, UX Designers, and engineering peers.\n- Foster psychological safety, mentor junior colleagues, and champion constructive retrospectives.\n- Navigate ambiguity and shifting business priorities with resilience and radical candor.\n- Align with company values: Empathy, Continuous Learning, and Extreme Ownership.',
  },
  {
    id: 'warmup',
    title: '10-Min General Warmup',
    company: 'Tech Startup',
    role: 'Fullstack Developer',
    difficulty: 'medium',
    type: 'standard',
    mode: 'hybrid',
    persona:
      'Jordan, friendly Tech Lead. Conducting a well-rounded warmup conversation on past achievements and problem-solving mindset.',
    tags: ['Warmup', 'General Tech', 'Quick'],
    description: 'Comfortable conversational warmup for any software engineering role.',
    jobDescription:
      'Responsibilities:\n- Develop fullstack web features in an agile startup environment.\n- Collaborate across product, design, and engineering teams.\n- Demonstrate strong fundamentals and pragmatic problem-solving.',
  },
];

interface InterviewPresetsProps {
  onSelectPreset: (preset: PresetItem, autoAdvance?: boolean) => void;
  activePresetId?: string | null;
}

export const InterviewPresets: React.FC<InterviewPresetsProps> = ({
  onSelectPreset,
  activePresetId,
}) => {
  const [inspectingPreset, setInspectingPreset] = useState<PresetItem | null>(null);

  const handleCardClick = (preset: PresetItem) => {
    // Open inspection modal so user can view full job details
    setInspectingPreset(preset);
  };

  const handleConfirmApply = (autoAdvance = true) => {
    if (!inspectingPreset) return;
    onSelectPreset(inspectingPreset, autoAdvance);
    setInspectingPreset(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Quick-Start Presets (1-Click Setup)
          </h3>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Tap any preset to inspect and apply sample job details
        </span>
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {INTERVIEW_PRESETS.map((preset) => {
          const isSelected = activePresetId === preset.id;
          return (
            <div
              key={preset.id}
              onClick={() => handleCardClick(preset)}
              className={cn(
                'relative p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between group',
                isSelected
                  ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary'
                  : 'bg-card/70 border-border hover:border-primary/50 hover:bg-muted/40'
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug">
                    {preset.title}
                  </h4>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] uppercase font-bold shrink-0 px-1.5 py-0',
                      preset.difficulty === 'hardcore'
                        ? 'border-destructive/40 text-destructive bg-destructive/5'
                        : preset.difficulty === 'hard'
                          ? 'border-warning/40 text-warning bg-warning/5'
                          : 'border-info/40 text-info bg-info/5'
                    )}
                  >
                    {preset.difficulty}
                  </Badge>
                </div>

                <p className="text-[11px] font-medium text-primary mb-1.5">@{preset.company}</p>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2.5">
                  {preset.description}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/50 mb-2">
                  {preset.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground group-hover:text-primary transition-colors font-medium">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Tap to view details
                  </span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preset Details Inspection Dialog */}
      {inspectingPreset && (
        <Dialog
          open={!!inspectingPreset}
          onOpenChange={(open) => !open && setInspectingPreset(null)}
        >
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] uppercase font-bold px-2 py-0.5',
                    inspectingPreset.difficulty === 'hardcore'
                      ? 'border-destructive/40 text-destructive bg-destructive/5'
                      : inspectingPreset.difficulty === 'hard'
                        ? 'border-warning/40 text-warning bg-warning/5'
                        : 'border-info/40 text-info bg-info/5'
                  )}
                >
                  {inspectingPreset.difficulty}
                </Badge>
                <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                  {inspectingPreset.type}
                </Badge>
                <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                  {inspectingPreset.mode} mode
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {inspectingPreset.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Review the pre-configured parameters and sample JD for this simulation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Target Role & Company */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/10 text-primary rounded-md">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Target Company</span>
                    <span className="font-bold text-sm text-foreground">
                      {inspectingPreset.company}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-right">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Role / Position</span>
                    <span className="font-bold text-sm text-foreground">
                      {inspectingPreset.role}
                    </span>
                  </div>
                  <div className="p-2 bg-info/10 text-info rounded-md">
                    <Briefcase className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* AI Interviewer Persona */}
              <div className="space-y-1.5 p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 font-semibold text-foreground text-xs">
                  <Bot className="w-4 h-4 text-primary" />
                  <span>AI Interviewer Persona</span>
                </div>
                <p className="text-muted-foreground leading-relaxed pl-6">
                  {inspectingPreset.persona}
                </p>
              </div>

              {/* Sample Job Description */}
              <div className="space-y-1.5 p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 font-semibold text-foreground text-xs">
                  <FileText className="w-4 h-4 text-info" />
                  <span>Sample Job Description (JD)</span>
                </div>
                <pre className="text-[11px] font-sans text-muted-foreground whitespace-pre-wrap leading-relaxed pl-6 bg-muted/20 p-2.5 rounded border border-border/50">
                  {inspectingPreset.jobDescription}
                </pre>
              </div>

              {/* Evaluation Focus Tags */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-foreground text-xs">
                  <Target className="w-4 h-4 text-success" />
                  <span>Evaluation Focus Areas</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pl-6">
                  {inspectingPreset.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs font-medium py-0.5">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleConfirmApply(false)}
                className="gap-1.5 text-xs order-2 sm:order-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Customize in Step 1
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleConfirmApply(true)}
                className="gap-1.5 text-xs font-semibold order-1 sm:order-2"
              >
                Apply &amp; Continue to Resume <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
