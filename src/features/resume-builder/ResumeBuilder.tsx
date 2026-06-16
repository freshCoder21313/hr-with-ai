import React from 'react';
import {
  Wand2, ChevronLeft, Save, Eye, LayoutTemplate, Printer, Loader2,
  Columns, List, Languages, Type as TypeIcon, Palette, Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Joyride from 'react-joyride';
import SEO from '@/components/shared/SEO';
import ResumePreview from './ResumePreview';
import SectionReorderDialog from './components/SectionReorderDialog';
import BasicsForm from './SectionForms/BasicsForm';
import WorkForm from './SectionForms/WorkForm';
import EducationForm from './SectionForms/EducationForm';
import SkillsForm from './SectionForms/SkillsForm';
import ProjectsForm from './SectionForms/ProjectsForm';
import QuickActionFab from './components/QuickActionFab';
import { useResumeBuilder } from './hooks/useResumeBuilder';

const ResumeBuilder: React.FC = () => {
  const { state, actions } = useResumeBuilder();

  if (state.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (state.notFound) return <div className="p-8">Resume not found</div>;

  const { data, resume, template } = state;

  return (
    <>
      <SEO title="Resume Builder - HR With AI" description="Build ATS-friendly resumes with AI assistance." />

      <div className="hidden print:block">
        <ResumePreview data={data!} template={template} onUpdate={actions.handleDirectUpdate} />
      </div>

      <SectionReorderDialog isOpen={state.showReorderDialog} onClose={() => actions.setShowReorderDialog(false)}
        data={{ ...data!, meta: { ...data!.meta, template } }}
        onSave={actions.handleOrderSave} />

      <Joyride steps={state.tourSteps} run={state.runTour} continuous showSkipButton showProgress
        styles={{ options: { primaryColor: '#8b5cf6' } }}
        callback={(d) => { if (d.status === 'finished' || d.status === 'skipped') actions.handleTourFinish(); }} />

      <div className="flex flex-col h-screen bg-background text-foreground print:hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0 gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => actions.navigate('/setup')} className="shrink-0">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="font-bold text-lg text-foreground truncate" title={resume!.fileName}>{resume!.fileName}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <div className="flex bg-muted p-1 rounded-lg mr-2 tour-preview-toggle">
              <Button size="sm" variant="ghost" onClick={() => actions.handleViewMode('editor')}
                className={!state.showPreview && !state.isSplitView ? 'bg-background shadow-sm hover:bg-background text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}>
                Editor
              </Button>
              <Button size="sm" variant="ghost" onClick={() => actions.handleViewMode('preview')}
                className={state.showPreview && !state.isSplitView ? 'bg-background shadow-sm hover:bg-background text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}>
                <Eye className="w-4 h-4 mr-2" /> Preview
              </Button>
              <Button size="sm" variant="ghost" onClick={() => actions.handleViewMode('split')}
                className={state.isSplitView ? 'bg-background shadow-sm hover:bg-background text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}>
                <Columns className="w-4 h-4 mr-2" /> Split
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={() => actions.setShowStyleEditor(!state.showStyleEditor)} className="mr-2">
              <Sliders className="w-4 h-4 mr-2 md:hidden" />
              <Sliders className="w-4 h-4 mr-2 hidden md:block" />
              <span className="hidden md:inline">Settings</span>
            </Button>

            {(state.showPreview || state.isSplitView) && (
              <div className="flex md:hidden items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <LayoutTemplate className="w-4 h-4" /> Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => actions.setShowReorderDialog(true)}>
                      <List className="w-4 h-4 mr-2" /> Arrange Sections
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={actions.handlePrint}>
                      <Printer className="w-4 h-4 mr-2" /> Export PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {!resume!.formatted && !state.showPreview && !state.isSplitView && (
              <LoadingButton onClick={actions.handleSmartFormat} disabled={state.isProcessing}
                isLoading={state.isProcessing} loadingText=""
                className="bg-purple-600 hover:bg-purple-700 text-white" leftIcon={<Wand2 className="w-4 h-4" />}>
                Smart Format
              </LoadingButton>
            )}

            <Button onClick={actions.handleSave} className="gap-2">
              <Save className="w-4 h-4" /> Save
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex">
          {state.isSplitView ? (
            <div className="flex w-full h-full overflow-hidden">
              <div className="w-1/2 border-r border-border flex flex-col bg-muted/10">
                <div className="p-4 border-b border-border bg-muted/20 font-medium text-sm text-muted-foreground flex justify-between items-center">
                  <span>Original Source (Raw Text)</span>
                  <span className="text-xs">Read-only</span>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <pre className="whitespace-pre-wrap font-mono text-xs md:text-sm text-foreground/80 leading-relaxed">
                    {resume!.rawText || 'No source text available.'}
                  </pre>
                </div>
              </div>
              <div className="w-1/2 flex flex-col bg-muted/30">
                <div className="p-4 border-b border-border bg-muted/20 font-medium text-sm text-muted-foreground text-center">
                  <span>Tailored Result (Preview)</span>
                </div>
                <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                  <div className="scale-[0.65] origin-top shadow-xl w-full max-w-[210mm]">
                    <ResumePreview data={state.debouncedData || data!} template={template}
                      onUpdate={actions.handleDirectUpdate} />
                  </div>
                </div>
              </div>
            </div>
          ) : state.showPreview ? (
            <div className="flex-1 relative overflow-hidden flex bg-muted/30">
              <div className="hidden md:flex flex-col gap-2 p-4 w-16 items-center shrink-0 z-10 justify-center">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => actions.setShowReorderDialog(true)}
                      className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all">
                      <List className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right"><p>Arrange Sections</p></TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all">
                          <LayoutTemplate className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right"><p>Switch Template</p></TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent side="right" align="start">
                    {(['modern', 'classic', 'creative', 'minimalist', 'academic'] as const).map((t) => (
                      <DropdownMenuItem key={t} onClick={() => actions.setTemplate(t)}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                          <Palette className="w-5 h-5 z-10" />
                          <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity"
                            style={{ backgroundColor: data?.meta?.themeColor || '#2563eb' }} />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right"><p>Change Theme Color</p></TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent side="right" align="start" className="w-48 p-2">
                    <div className="grid grid-cols-4 gap-2">
                      {['#2563eb', '#1e40af', '#0f172a', '#059669', '#16a34a', '#d97706', '#ea580c', '#dc2626',
                        '#e11d48', '#c026d3', '#9333ea', '#7c3aed', '#4f46e5', '#0891b2', '#0d9488', '#0284c7'].map((color) => (
                        <button key={color}
                          className="w-8 h-8 rounded-full border border-border shadow-sm hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          style={{ backgroundColor: color }}
                          onClick={() => actions.handleThemeColorChange(color)} title={color} />
                      ))}
                    </div>
                    <div className="col-span-4 mt-2 text-xs text-muted-foreground text-center">Color applied to all templates</div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all">
                          <TypeIcon className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right"><p>Change Font</p></TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem onClick={() => actions.handleFontChange('sans')}>Sans-serif</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => actions.handleFontChange('serif')}>Serif</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => actions.handleFontChange('mono')}>Monospace</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                <div className="scale-[0.8] md:scale-90 origin-top shadow-2xl h-fit">
                  <ResumePreview data={state.debouncedData || data!} template={template}
                    onUpdate={actions.handleDirectUpdate} />
                </div>
              </div>

              <div className="hidden md:flex flex-col gap-2 p-4 w-16 items-center shrink-0 z-10 justify-center">
                {(template === 'creative' || template === 'minimalist' || template === 'academic') && (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="relative flex items-center justify-center">
                        <div className="h-10 w-10 rounded-full bg-background shadow-sm flex items-center justify-center cursor-pointer overflow-hidden border border-input hover:shadow-md transition-all">
                          <input type="color" value={data?.meta?.themeColor || '#8b5cf6'}
                            onChange={(e) => actions.handleThemeColorChange(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer h-full w-full" />
                          <div className="w-6 h-6 rounded-full border border-black/10"
                            style={{ backgroundColor: data?.meta?.themeColor || '#8b5cf6' }} />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left"><p>Theme Color</p></TooltipContent>
                  </Tooltip>
                )}

                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon"
                      className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all relative">
                      <Languages className="w-5 h-5" />
                      <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-primary text-primary-foreground px-1 rounded-sm uppercase">{state.viewLanguage}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold">Current: {state.viewLanguage === 'en' ? 'English' : 'Vietnamese'}</p>
                      <Button size="sm" variant="secondary" className="w-full text-xs h-7"
                        onClick={actions.handleTranslate} disabled={state.isTranslating}>
                        {state.isTranslating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}
                        Translate
                      </Button>
                    </div>
                  </TooltipContent>
                </Tooltip>

                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={actions.handlePrint}
                      className="h-10 w-10 rounded-full bg-background text-primary border-primary/20 hover:bg-primary/5 shadow-sm hover:shadow-md transition-all">
                      <Printer className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left"><p>Export PDF</p></TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : (
            <>
              <div className="w-64 bg-card border-r border-border flex-shrink-0 overflow-y-auto">
                <Tabs value={state.activeTab} onValueChange={actions.setActiveTab} className="w-full">
                  <TabsList className="flex flex-col h-auto bg-transparent p-2 gap-1 w-full justify-start">
                    <TabsTrigger value="basics" className="w-full justify-start px-4 py-2">Basics & Contact</TabsTrigger>
                    <TabsTrigger value="work" className="w-full justify-start px-4 py-2">Work Experience</TabsTrigger>
                    <TabsTrigger value="education" className="w-full justify-start px-4 py-2">Education</TabsTrigger>
                    <TabsTrigger value="skills" className="w-full justify-start px-4 py-2">Skills</TabsTrigger>
                    <TabsTrigger value="projects" className="w-full justify-start px-4 py-2">Projects</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-background editor-scroll-area">
                <div className="max-w-3xl mx-auto">
                  {!resume!.formatted && !data!.basics.name && (
                    <Card className="mb-8 p-6 bg-purple-500/10 border-purple-500/20 border tour-magic-format">
                      <h3 className="font-bold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
                        <Wand2 className="w-5 h-5" /> AI Magic Available
                      </h3>
                      <p className="text-purple-600 dark:text-purple-300 text-sm mb-4">
                        This resume seems to be raw text. Use &quot;Smart Format&quot; to automatically structure it into fields using AI.
                      </p>
                      <LoadingButton onClick={actions.handleSmartFormat} disabled={state.isProcessing}
                        isLoading={state.isProcessing} loadingText="Formatting..." size="sm" variant="secondary">
                        Format Now
                      </LoadingButton>
                    </Card>
                  )}

                  {state.activeTab === 'basics' && (
                    <BasicsForm data={data!.basics} onChange={(val) => actions.updateSection('basics', val)} />
                  )}
                  {state.activeTab === 'work' && (
                    <WorkForm data={data!.work} onChange={(val) => actions.updateSection('work', val)} />
                  )}
                  {state.activeTab === 'education' && (
                    <EducationForm data={data!.education} onChange={(val) => actions.updateSection('education', val)} />
                  )}
                  {state.activeTab === 'skills' && (
                    <SkillsForm data={data!.skills} onChange={(val) => actions.updateSection('skills', val)} />
                  )}
                  {state.activeTab === 'projects' && (
                    <ProjectsForm data={data!.projects} onChange={(val) => actions.updateSection('projects', val)} />
                  )}
                </div>
              </div>

              <div className="tour-fab">
                <QuickActionFab onAddSection={actions.handleAddSection}
                  onScrollToTop={() => document.querySelector('.editor-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' })}
                  onScrollToBottom={() => document.querySelector('.editor-scroll-area')?.scrollTo({ top: 9999, behavior: 'smooth' })} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ResumeBuilder;
