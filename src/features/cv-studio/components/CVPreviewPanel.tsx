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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Eye, Edit3, Columns, LayoutTemplate, Palette, Type as TypeIcon,
  List, Printer,
} from 'lucide-react';

interface CVPreviewPanelProps {
  previewData: ResumeData | undefined;
  template: TemplateType;
  previewViewMode: 'preview' | 'form' | 'split';
  activeTab: string;
  mainCV: Resume | null;
  onSetPreviewViewMode: (mode: 'preview' | 'form' | 'split') => void;
  onSetTemplate: (template: TemplateType) => void;
  onSetActiveTab: (tab: string) => void;
  onManualUpdate: (data: ResumeData) => void;
  onOpenReorderDialog: () => void;
  onPrint: () => void;
}

export const CVPreviewPanel: React.FC<CVPreviewPanelProps> = ({
  previewData, template, previewViewMode, activeTab, mainCV,
  onSetPreviewViewMode, onSetTemplate, onSetActiveTab,
  onManualUpdate, onOpenReorderDialog, onPrint,
}) => {
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
                    <ResumePreview data={previewData} template={template} onUpdate={onManualUpdate} />
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
      <div className="flex w-full h-full overflow-hidden">
        <div className="w-44 shrink-0 border-r border-border bg-card overflow-y-auto">
          <Tabs value={activeTab} onValueChange={onSetActiveTab}>
            <TabsList className="flex flex-col h-auto bg-transparent p-2 gap-1 w-full justify-start">
              <TabsTrigger value="basics" className="w-full justify-start px-3 py-2 text-xs">Basics</TabsTrigger>
              <TabsTrigger value="work" className="w-full justify-start px-3 py-2 text-xs">Work</TabsTrigger>
              <TabsTrigger value="education" className="w-full justify-start px-3 py-2 text-xs">Education</TabsTrigger>
              <TabsTrigger value="skills" className="w-full justify-start px-3 py-2 text-xs">Skills</TabsTrigger>
              <TabsTrigger value="projects" className="w-full justify-start px-3 py-2 text-xs">Projects</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {mainCV?.parsedData ? (
            <div className="max-w-2xl mx-auto">
              {activeTab === 'basics' && (
                <BasicsForm data={mainCV.parsedData.basics}
                  onChange={(v) => onManualUpdate({ ...mainCV.parsedData!, basics: v })} />
              )}
              {activeTab === 'work' && (
                <WorkForm data={mainCV.parsedData.work}
                  onChange={(v) => onManualUpdate({ ...mainCV.parsedData!, work: v })} />
              )}
              {activeTab === 'education' && (
                <EducationForm data={mainCV.parsedData.education}
                  onChange={(v) => onManualUpdate({ ...mainCV.parsedData!, education: v })} />
              )}
              {activeTab === 'skills' && (
                <SkillsForm data={mainCV.parsedData.skills}
                  onChange={(v) => onManualUpdate({ ...mainCV.parsedData!, skills: v })} />
              )}
              {activeTab === 'projects' && (
                <ProjectsForm data={mainCV.parsedData.projects}
                  onChange={(v) => onManualUpdate({ ...mainCV.parsedData!, projects: v })} />
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
      <div className="h-12 px-4 border-b border-border bg-background flex items-center justify-between shrink-0 gap-2">
        <div className="flex bg-muted p-1 rounded-lg">
          <Button variant="ghost" size="sm"
            className={`h-7 px-3 gap-1 text-xs ${previewViewMode === 'preview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSetPreviewViewMode('preview')}>
            <Eye size={12} /> Preview
          </Button>
          <Button variant="ghost" size="sm"
            className={`h-7 px-3 gap-1 text-xs ${previewViewMode === 'form' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSetPreviewViewMode('form')}>
            <Edit3 size={12} /> Form
          </Button>
          <Button variant="ghost" size="sm"
            className={`h-7 px-3 gap-1 text-xs ${previewViewMode === 'split' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSetPreviewViewMode('split')}>
            <Columns size={12} /> Split
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><LayoutTemplate className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Switch Template</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              {(['modern', 'classic', 'creative', 'minimalist', 'academic'] as const).map((t) => (
                <DropdownMenuItem key={t} onClick={() => onSetTemplate(t)}>
                  {template === t ? '\u2713 ' : ''}{t.charAt(0).toUpperCase() + t.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 relative overflow-hidden">
                    <Palette className="w-4 h-4 z-10" />
                    <div className="absolute inset-0 opacity-20"
                      style={{ backgroundColor: previewData?.meta?.themeColor || '#2563eb' }} />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Theme Color</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48 p-2">
              <div className="grid grid-cols-4 gap-2">
                {['#2563eb', '#0f172a', '#059669', '#16a34a', '#d97706', '#ea580c', '#dc2626', '#e11d48',
                  '#c026d3', '#9333ea', '#7c3aed', '#4f46e5', '#0891b2', '#0d9488'].map((color) => (
                  <button key={color}
                    className="w-8 h-8 rounded-full border border-border shadow-sm hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      if (!mainCV?.parsedData || !mainCV.id) return;
                      onManualUpdate({ ...mainCV.parsedData, meta: { ...mainCV.parsedData.meta, themeColor: color } });
                    }} />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><TypeIcon className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Font</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              {(['sans', 'serif', 'mono'] as const).map((font) => (
                <DropdownMenuItem key={font} onClick={() => {
                  if (!mainCV?.parsedData || !mainCV.id) return;
                  onManualUpdate({ ...mainCV.parsedData, meta: { ...mainCV.parsedData.meta, fontFamily: font } });
                }}>
                  {font === 'sans' ? 'Sans-serif' : font === 'serif' ? 'Serif' : 'Monospace'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenReorderDialog} disabled={!previewData}>
                <List className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Arrange Sections</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={onPrint} disabled={!previewData}>
                <Printer className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export PDF</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {renderContent()}
      </div>
    </div>
  );
};