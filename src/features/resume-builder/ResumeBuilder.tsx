import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, FileQuestion } from 'lucide-react';
import Joyride from 'react-joyride';
import SEO from '@/components/shared/SEO';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import ResumePreview from './ResumePreview';
import SectionReorderDialog from './components/SectionReorderDialog';
import { useResumeBuilder } from './hooks/useResumeBuilder';
import { BuilderHeader } from './components/builder/BuilderHeader';
import { EditorView } from './components/builder/EditorView';
import { PreviewView } from './components/builder/PreviewView';
import { SplitView } from './components/builder/SplitView';
import { ChevronLeft } from 'lucide-react';

const ResumeBuilder: React.FC = () => {
  const { state, actions } = useResumeBuilder();
  const { data, template } = state;
  const { navigate, setShowReorderDialog, handleTourDismiss, handleTourCallback } = actions;
  // The export host renders a full copy of the preview, including every
  // inline-edit trigger. `inert` keeps that copy out of the tab order and the
  // a11y tree; it is set from a callback ref because the host only mounts once
  // loading finishes, and React 18's types don't declare the attribute.
  const [exportHost, setExportHost] = useState<HTMLDivElement | null>(null);

  const handleBack = useCallback(() => navigate('/setup'), [navigate]);

  useEffect(() => {
    exportHost?.setAttribute('inert', '');
  }, [exportHost]);

  // Joyride only handles Escape while a step is in its TOOLTIP lifecycle, so a
  // step whose target never mounted leaves the tour open behind a
  // click-swallowing overlay. This listener closes it unconditionally.
  useEffect(() => {
    if (!state.runTour) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleTourDismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [state.runTour, handleTourDismiss]);

  const closeReorder = useCallback(() => setShowReorderDialog(false), [setShowReorderDialog]);
  const openReorder = useCallback(() => setShowReorderDialog(true), [setShowReorderDialog]);
  const reorderData = useMemo(
    () => (data ? { ...data, meta: { ...data.meta, template } } : null),
    [data, template]
  );

  if (state.isLoading) {
    return (
      <div
        data-app-fill
        className="flex flex-1 min-h-0 items-center justify-center bg-background text-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading resume…</span>
      </div>
    );
  }

  if (state.notFound) {
    return (
      <div
        data-app-fill
        className="flex flex-1 min-h-0 items-center justify-center bg-background text-foreground p-6"
      >
        <EmptyState
          icon={<FileQuestion className="h-8 w-8" aria-hidden="true" />}
          title="Resume not found"
          message="This resume may have been deleted, or the link is no longer valid."
          action={
            <Button onClick={handleBack}>
              <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back to dashboard
            </Button>
          }
        />
      </div>
    );
  }

  const { resume } = state;
  const viewMode = state.isSplitView ? 'split' : state.showPreview ? 'preview' : 'editor';

  return (
    <>
      <SEO
        title="Resume Builder - HR With AI"
        description="Build ATS-friendly resumes with AI assistance."
      />

      {/* Off-screen, fully laid-out capture host for PDF export (display:none
          cannot be rasterized). Fixed A4 width keeps output deterministic
          across view modes; also serves browser print via print: overrides. */}
      <div
        ref={setExportHost}
        aria-hidden="true"
        className="pointer-events-none fixed -left-[10000px] top-0 w-[794px] bg-white print:static print:left-0 print:w-auto"
      >
        <ResumePreview data={data!} template={template} onUpdate={actions.handleDirectUpdate} />
      </div>

      <SectionReorderDialog
        isOpen={state.showReorderDialog}
        onClose={closeReorder}
        data={reorderData!}
        onSave={actions.handleOrderSave}
      />

      <Joyride
        steps={state.tourSteps}
        run={state.runTour}
        continuous
        showSkipButton
        showProgress
        styles={{ options: { primaryColor: '#8b5cf6' } }}
        callback={(d) => handleTourCallback(d.status)}
      />

      <div
        data-app-fill
        className="flex flex-col flex-1 min-h-0 bg-background text-foreground print:hidden"
      >
        <BuilderHeader
          resume={resume!}
          viewMode={viewMode}
          isProcessing={state.isProcessing}
          isSaving={state.isSaving}
          onBack={handleBack}
          onViewModeChange={actions.handleViewMode}
          onSmartFormat={actions.handleSmartFormat}
          onSave={actions.handleSave}
        />

        <div className="flex-1 overflow-hidden flex">
          {state.isSplitView ? (
            <SplitView
              resume={resume!}
              // Live data, not the debounced snapshot: the preview is itself an
              // editing surface, so a stale snapshot makes the next inline edit
              // write back the previous value and silently lose changes.
              data={data!}
              template={template}
              onUpdate={actions.handleDirectUpdate}
            />
          ) : state.showPreview ? (
            <PreviewView
              data={data!}
              template={template}
              viewLanguage={state.viewLanguage}
              isTranslating={state.isTranslating}
              onUpdate={actions.handleDirectUpdate}
              onSetTemplate={actions.setTemplate}
              onThemeColorChange={actions.handleThemeColorChange}
              onFontChange={actions.handleFontChange}
              onTranslate={actions.handleTranslate}
              onPrint={() => actions.handleExportPdf(exportHost, resume?.fileName ?? 'resume')}
              onShowReorder={openReorder}
            />
          ) : (
            <EditorView
              resume={resume!}
              data={data!}
              activeTab={state.activeTab}
              isProcessing={state.isProcessing}
              onActiveTabChange={actions.setActiveTab}
              onUpdateSection={actions.updateSection}
              onSmartFormat={actions.handleSmartFormat}
              onAddSection={actions.handleAddSection}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default ResumeBuilder;
