import React, { Suspense, lazy, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ApiKeyModal from '@/features/settings/ApiKeyModal';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { ThemeProvider } from '@/components/shared/theme-provider';
import SettingsModal from '@/components/shared/SettingsModal';
import Header from '@/components/layout/Header';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { GlobalErrorHandler } from '@/components/shared/GlobalErrorHandler';
import { db } from '@/lib/db';
import { hasActiveProfile, openApiKeyModal, subscribeToApiKeyModal } from '@/events/apiKeyEvents';
import { useFocusReturn } from '@/components/shared/useFocusReturn';
import { subscribeToSettingsChanged } from '@/events/settingsEvents';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
const SetupRoom = lazy(() => import('@/features/dashboard/SetupRoom'));
const InterviewRoom = lazy(() => import('@/features/interview/InterviewRoom'));
const FeedbackView = lazy(() => import('@/features/interview/FeedbackView'));
const ResumeBuilder = lazy(() => import('@/features/resume-builder/ResumeBuilder'));
const CVStudioPage = lazy(() => import('@/features/cv-studio/CVStudioPage'));
const LandingPage = lazy(() => import('@/features/landing/LandingPage'));
const HistoryPage = lazy(() => import('@/features/history/HistoryPage'));
const SkillAssessmentPage = lazy(() => import('@/features/skill-assessment/SkillAssessmentPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50dvh]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Sonner's toaster is `position: fixed`, so the shell's safe-area padding does not
// reach it. Keep its default gaps (24px desktop / 16px mobile) and add the bottom
// inset so toasts clear the Android gesture bar / iOS home indicator.
const TOAST_OFFSET = { bottom: 'calc(24px + var(--safe-bottom, 0px))' } as const;
const TOAST_MOBILE_OFFSET = { bottom: 'calc(16px + var(--safe-bottom, 0px))' } as const;

const App: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsFocus = useFocusReturn();

  const [showConfigBanner, setShowConfigBanner] = useState(() => {
    const dismissed = localStorage.getItem('ai_setup_banner_dismissed') === 'true';
    return !dismissed && !hasActiveProfile();
  });

  useEffect(() => {
    // Re-sample profile state on both entry points: the API key modal opening and
    // any successful settings save. Only the former was watched before, so the
    // first-run banner outlived the very save it asks the user to make.
    const hideIfConfigured = () => {
      if (hasActiveProfile()) setShowConfigBanner(false);
    };
    const unsubscribeModal = subscribeToApiKeyModal(hideIfConfigured);
    const unsubscribeSettings = subscribeToSettingsChanged(hideIfConfigured);
    return () => {
      unsubscribeModal();
      unsubscribeSettings();
    };
  }, []);

  useEffect(() => {
    // Run background cleanup on mount (once)
    const cleanup = async () => {
      try {
        await db.cleanOldResumes();
      } catch (err) {
        logger.error('Background cleanup failed', err);
      }
    };
    cleanup();
  }, []);

  const dismissBanner = () => {
    localStorage.setItem('ai_setup_banner_dismissed', 'true');
    setShowConfigBanner(false);
  };
  const openSettings = (trigger: HTMLElement) => {
    settingsFocus.capture(trigger);
    setIsSettingsOpen(true);
  };

  const handleSettingsOpenChange = (open: boolean) => {
    setIsSettingsOpen(open);
    // Radix's closeAutoFocus handles the animated path; this covers the rest so
    // no close path can strand focus on <body>.
    if (!open) settingsFocus.restore();
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="hr-ai-theme">
      <HelmetProvider>
        <TooltipProvider>
          <NotificationProvider>
            <HashRouter>
              <GlobalErrorHandler />
              <ErrorBoundary>
                <div className="app-shell min-h-[100dvh] flex flex-col bg-background text-foreground pt-[var(--safe-top)] pb-[var(--safe-bottom)] pl-[var(--safe-left)] pr-[var(--safe-right)] print:block print:bg-white print:min-h-0">
                  <ApiKeyModal />
                  <SettingsModal
                    open={isSettingsOpen}
                    onOpenChange={handleSettingsOpenChange}
                    restoreFocusTarget={settingsFocus.triggerRef.current}
                  />
                  <Header onOpenSettings={openSettings} />

                  {showConfigBanner && (
                    <div className="container mx-auto px-4 pt-3 print:hidden">
                      <Alert className="py-2.5 px-4 flex items-center justify-between gap-3 bg-warning/10 border-warning/30 text-warning">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                          <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                          <span>AI provider not configured — some features will fail.</span>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-warning font-semibold underline underline-offset-2 ml-1"
                            onClick={() => openApiKeyModal()}
                          >
                            Set up now
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-warning hover:bg-warning/20 shrink-0"
                          onClick={dismissBanner}
                          aria-label="Dismiss banner"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </Alert>
                    </div>
                  )}
                  <Toaster
                    position="bottom-center"
                    richColors
                    closeButton
                    offset={TOAST_OFFSET}
                    mobileOffset={TOAST_MOBILE_OFFSET}
                  />

                  <main className="app-main flex-1 w-full py-0 print:p-0 print:m-0 print:block print:flex-none">
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/setup" element={<SetupRoom />} />
                        <Route path="/history" element={<HistoryPage />} />
                        <Route path="/resumes/:id/edit" element={<ResumeBuilder />} />
                        <Route path="/studio" element={<CVStudioPage />} />
                        <Route path="/skill-assessment" element={<SkillAssessmentPage />} />
                        <Route path="/interview/:id" element={<InterviewRoom />} />
                        <Route path="/feedback/:id" element={<FeedbackView />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                  </main>
                </div>
              </ErrorBoundary>
            </HashRouter>
          </NotificationProvider>
        </TooltipProvider>
      </HelmetProvider>
    </ThemeProvider>
  );
};

export default App;
