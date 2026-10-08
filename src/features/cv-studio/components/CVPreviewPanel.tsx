import { Resume } from '@/types';
import { ResumeData } from '@/types/resume';
import { TemplateType } from '@/types/resume';
import ResumePreview from '@/features/resume-builder/ResumePreview';
import BasicsForm from '@/features/resume-builder/SectionForms/BasicsForm';
import WorkForm from '@/features/resume-builder/SectionForms/WorkForm';
import EducationForm from '@/features/resume-builder/SectionForms/EducationForm';
import SkillsForm from '@/features/resume-builder/SectionForms/SkillsForm';
import ProjectsForm from '@/features/resume-builder/SectionForms/ProjectsForm';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Edit3,
  Columns,
  LayoutTemplate,
  Palette,
  Type as TypeIcon,
  List,
  Printer,
  Loader2,
  ExternalLink,
  User,
  Briefcase,
  GraduationCap,
  Code,
  Sparkles,
} from 'lucide-react';

const THEME_COLORS = [
  { value: '#2563eb', name: 'Blue' },
  { value: '#0f172a', name: 'Slate' },
  { value: '#059669', name: 'Emerald' },
  { value: '#16a34a', name: 'Green' },
  { value: '#d97706', name: 'Amber' },
  { value: '#ea580c', name: 'Orange' },
  { value: '#dc2626', name: 'Red' },
  { value: '#e11d48', name: 'Rose' },
  { value: '#c026d3', name: 'Fuchsia' },
  { value: '#9333ea', name: 'Purple' },
  { value: '#7c3aed', name: 'Violet' },
  { value: '#4f46e5', name: 'Indigo' },
  { value: '#0891b2', name: 'Cyan' },
  { value: '#0d9488', name: 'Teal' },
] as const;

interface CVPreviewPanelProps {
  previewData: ResumeData | undefined;
  template: TemplateType;
  previewViewMode: 'preview' | 'form' | 'split';
  activeTab: string;
  mainCV: Resume | null;
  isExporting?: boolean;
  onSetPreviewViewMode: (mode: 'preview' | 'form' | 'split') => void;
  onSetTemplate: (template: TemplateType) => void;
  onSetActiveTab: (tab: string) => void;
  onManualUpdate: (data: ResumeData) => void;
  onOpenReorderDialog: () => void;
  onPrint: () => void;
  onOpenFullEditor?: () => void;
}

export const CVPreviewPanel: React.FC<CVPreviewPanelProps> = ({
  previewData,
  template,
  previewViewMode,
  activeTab,
  mainCV,
  isExporting = false,
  onSetPreviewViewMode,
  onSetTemplate,
  onSetActiveTab,
  onManualUpdate,
  onOpenReorderDialog,
  onPrint,
  onOpenFullEditor,
}) => {
  const selectedThemeColor = (previewData?.meta?.themeColor || '#2563eb').toLowerCase();

  const setThemeColor = (color: string) => {
    if (!mainCV?.parsedData || !mainCV.id) return;
    onManualUpdate({
      ...mainCV.parsedData,
      meta: { ...mainCV.parsedData.meta, themeColor: color },
    });
  };
  const renderContent = () => {
    if (previewViewMode === 'split') {
      return (
        <div className="flex w-full h-full overflow-hidden">
          <div className="w-1/2 border-r border-border flex flex-col bg-muted/10">
            <div className="p-3 border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground flex justify-between">
              <span>CV Data (JSON)</span>
              <span>Read-only</span>
            </div>
            <div className="flex-1 overflow-auto p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs text-foreground/70 leading-relaxed">
                {previewData ? JSON.stringify(previewData, null, 2) : 'No data'}
              </pre>
            </div>
          </div>
          <div className="w-1/2 flex flex-col bg-muted/30">
            <div className="p-3 border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground text-center">
              CV Preview
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex justify-center">
              {previewData ? (
                <div className="scale-[0.62] origin-top w-full max-w-[210mm]">
                  <div className="bg-white shadow-xl">
                    <ResumePreview
                      data={previewData}
                      template={template}
                      onUpdate={onManualUpdate}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pt-12">No CV selected</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (previewViewMode === 'preview') {
      return (
        <div className="flex w-full h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-muted/30">
            {previewData ? (
              <div className="scale-[0.78] origin-top w-full max-w-[210mm]">
                <div className="bg-white shadow-2xl min-h-[297mm]">
                  <ResumePreview data={previewData} template={template} onUpdate={onManualUpdate} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <Eye className="w-12 h-12 opacity-20" />
                <p className="text-sm">No CV to preview</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex w-full h-full overflow-hidden flex-col">
        <div className="border-b border-border bg-card/60 px-3 sm:px-4 py-2 shrink-0 flex items-center overflow-x-auto scrollbar-hide">
          <Tabs value={activeTab} onValueChange={onSetActiveTab} className="w-full">
            <TabsList className="inline-flex bg-muted p-1 rounded-lg h-auto gap-1">
              <TabsTrigger
                value="basics"
                className="h-7 px-2.5 sm:px-3 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground hover:text-foreground gap-1.5"
              >
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Basics</span>
              </TabsTrigger>
              <TabsTrigger
                value="work"
                className="h-7 px-2.5 sm:px-3 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground hover:text-foreground gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Work</span>
              </TabsTrigger>
              <TabsTrigger
                value="education"
                className="h-7 px-2.5 sm:px-3 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground hover:text-foreground gap-1.5"
              >
                <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Education</span>
              </TabsTrigger>
              <TabsTrigger
                value="skills"
                className="h-7 px-2.5 sm:px-3 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground hover:text-foreground gap-1.5"
              >
                <Code className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Skills</span>
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="h-7 px-2.5 sm:px-3 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground hover:text-foreground gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Projects</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-background xl:p-6">
          {mainCV?.parsedData ? (
            <div className="max-w-2xl mx-auto">
              {activeTab === 'basics' && (
                <BasicsForm
                  data={mainCV.parsedData.basics}
                  onChange={(v) => onManualUpdate({ ...mainCV.parsedData!, basics: v })}
                />
              )}
              {activeTab === 'work' && (
                <WorkForm
                  data={mainCV.parsedData.work}
                  onChange={(v) => onManualUpdate({ ...mainCV.parsedData!, work: v })}
                />
              )}
              {activeTab === 'education' && (
                <EducationForm
                  data={mainCV.parsedData.education}
                  onChange={(v) => onManualUpdate({ ...mainCV.parsedData!, education: v })}
                />
              )}
              {activeTab === 'skills' && (
                <SkillsForm
                  data={mainCV.parsedData.skills}
                  onChange={(v) => onManualUpdate({ ...mainCV.parsedData!, skills: v })}
                />
              )}
              {activeTab === 'projects' && (
                <ProjectsForm
                  data={mainCV.parsedData.projects}
                  onChange={(v) => onManualUpdate({ ...mainCV.parsedData!, projects: v })}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No CV selected</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
      <div className="h-12 px-3 sm:px-4 border-b border-border bg-background flex items-center justify-between shrink-0 gap-2">
        <div className="flex bg-muted p-1 rounded-lg shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 sm:px-3 gap-1 text-xs ${previewViewMode === 'preview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSetPreviewViewMode('preview')}
            aria-pressed={previewViewMode === 'preview'}
          >
            <Eye size={12} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Preview</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 sm:px-3 gap-1 text-xs ${previewViewMode === 'form' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSetPreviewViewMode('form')}
            aria-pressed={previewViewMode === 'form'}
          >
            <Edit3 size={12} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Form</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 sm:px-3 gap-1 text-xs ${previewViewMode === 'split' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSetPreviewViewMode('split')}
            aria-pressed={previewViewMode === 'split'}
          >
            <Columns size={12} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Split</span>
          </Button>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {onOpenFullEditor && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenFullEditor}
              disabled={!mainCV?.id && !previewData}
              className="h-7 px-2 sm:px-2.5 gap-1.5 text-xs text-primary border-primary/20 hover:bg-primary/10 hover:border-primary/40 font-medium"
              title="Open full distraction-free Resume Builder workspace"
              aria-label="Open Focus Mode"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Focus Mode</span>
              <span className="sm:hidden">Focus</span>
            </Button>
          )}

          <DropdownMenu>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Switch template">
                    <LayoutTemplate className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Switch Template</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              {(['modern', 'classic', 'creative', 'minimalist', 'academic'] as const).map((t) => (
                <DropdownMenuItem key={t} onClick={() => onSetTemplate(t)}>
                  {template === t ? '\u2713 ' : ''}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="relative overflow-hidden"
                    aria-label="Theme color"
                  >
                    <Palette className="w-4 h-4 z-10" aria-hidden="true" />
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{ backgroundColor: selectedThemeColor }}
                    />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Theme Color</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48 p-2">
              <DropdownMenuRadioGroup value={selectedThemeColor} onValueChange={setThemeColor}>
                <div className="grid grid-cols-4 gap-2">
                  {THEME_COLORS.map(({ value, name }) => (
                    <DropdownMenuRadioItem
                      key={value}
                      value={value}
                      aria-label={`${name}${selectedThemeColor === value ? ' (selected)' : ''}`}
                      textValue={name}
                      onSelect={(event) => event.preventDefault()}
                      className="h-8 w-8 rounded-full border border-border shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={{ backgroundColor: value }}
                    >
                      <span
                        className="flex h-full w-full items-center justify-center text-white drop-shadow"
                        aria-hidden="true"
                      >
                        {selectedThemeColor === value ? '✓' : null}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </div>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Font">
                    <TypeIcon className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Font</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              {(['sans', 'serif', 'mono'] as const).map((font) => (
                <DropdownMenuItem
                  key={font}
                  onClick={() => {
                    if (!mainCV?.parsedData || !mainCV.id) return;
                    onManualUpdate({
                      ...mainCV.parsedData,
                      meta: { ...mainCV.parsedData.meta, fontFamily: font },
                    });
                  }}
                >
                  {font === 'sans' ? 'Sans-serif' : font === 'serif' ? 'Serif' : 'Monospace'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onOpenReorderDialog}
                disabled={!previewData}
                aria-label="Arrange sections"
              >
                <List className="w-4 h-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Arrange Sections</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-primary"
                onClick={onPrint}
                disabled={!previewData || isExporting}
                aria-label="Export PDF"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Printer className="w-4 h-4" aria-hidden="true" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export PDF</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">{renderContent()}</div>
    </div>
  );
};
