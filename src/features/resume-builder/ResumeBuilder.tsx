import React from 'react';
import { Loader2 } from 'lucide-react';
import Joyride from 'react-joyride';
import SEO from '@/components/shared/SEO';
import ResumePreview from './ResumePreview';
import SectionReorderDialog from './components/SectionReorderDialog';
import { useResumeBuilder } from './hooks/useResumeBuilder';
import { BuilderHeader } from './components/builder/BuilderHeader';
import { EditorView } from './components/builder/EditorView';
import { PreviewView } from './components/builder/PreviewView';
import { SplitView } from './components/builder/SplitView';

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
  const viewMode = state.isSplitView ? 'split' : state.showPreview ? 'preview' : 'editor';

  return (
    <>
      <SEO
        title="Resume Builder - HR With AI"
        description="Build ATS-friendly resumes with AI assistance."
      />

      <div className="hidden print:block">
        <ResumePreview data={data!} template={template} onUpdate={actions.handleDirectUpdate} />
      </div>

      <SectionReorderDialog
        isOpen={state.showReorderDialog}
        onClose={() => actions.setShowReorderDialog(false)}
        data={{ ...data!, meta: { ...data!.meta, template } }}
        onSave={actions.handleOrderSave}
      />

      <Joyride
        steps={state.tourSteps}
        run={state.runTour}
        continuous
        showSkipButton
        showProgress
        styles={{ options: { primaryColor: '#8b5cf6' } }}
        callback={(d) => {
          if (d.status === 'finished' || d.status === 'skipped') actions.handleTourFinish();
        }}
      />

      <div className="flex flex-col h-screen bg-background text-foreground print:hidden">
        <BuilderHeader
          resume={resume!}
          viewMode={viewMode}
          isProcessing={state.isProcessing}
          onBack={() => actions.navigate('/setup')}
          onViewModeChange={actions.handleViewMode}
          onSmartFormat={actions.handleSmartFormat}
          onSave={actions.handleSave}
        />

        <div className="flex-1 overflow-hidden flex">
          {state.isSplitView ? (
            <SplitView
              resume={resume!}
              data={state.debouncedData || data!}
              template={template}
              onUpdate={actions.handleDirectUpdate}
            />
          ) : state.showPreview ? (
            <PreviewView
              data={state.debouncedData || data!}
              template={template}
              viewLanguage={state.viewLanguage}
              isTranslating={state.isTranslating}
              onUpdate={actions.handleDirectUpdate}
              onSetTemplate={actions.setTemplate}
              onThemeColorChange={actions.handleThemeColorChange}
              onFontChange={actions.handleFontChange}
              onTranslate={actions.handleTranslate}
              onPrint={actions.handlePrint}
              onShowReorder={() => actions.setShowReorderDialog(true)}
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
