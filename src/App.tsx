import React, { Suspense, lazy, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ApiKeyModal from '@/features/settings/ApiKeyModal';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { ThemeProvider } from '@/components/shared/theme-provider';
import Header from '@/components/layout/Header';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { GlobalErrorHandler } from '@/components/shared/GlobalErrorHandler';
import { db } from '@/lib/db';
import { hasActiveProfile, openApiKeyModal, subscribeToApiKeyModal } from '@/events/apiKeyEvents';
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
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App: React.FC = () => {
  const [showConfigBanner, setShowConfigBanner] = useState(() => {
    const dismissed = localStorage.getItem('ai_setup_banner_dismissed') === 'true';
    return !dismissed && !hasActiveProfile();
  });

  useEffect(() => {
    // When API key modal opens or user sets a key, re-check active profile
    const unsubscribe = subscribeToApiKeyModal(() => {
      if (hasActiveProfile()) {
        setShowConfigBanner(false);
      }
    });
    return () => unsubscribe();
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

  return (
    <ThemeProvider defaultTheme="system" storageKey="hr-ai-theme">
      <HelmetProvider>
        <TooltipProvider>
          <NotificationProvider>
            <HashRouter>
              <GlobalErrorHandler />
              <ErrorBoundary>
                <div className="min-h-[100dvh] flex flex-col bg-background text-foreground pt-[var(--safe-top)] pb-[var(--safe-bottom)] pl-[var(--safe-left)] pr-[var(--safe-right)] print:block print:bg-white print:min-h-0">
                  <ApiKeyModal />
                  <Header />

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
                          size="icon"
                          className="h-6 w-6 text-warning hover:bg-warning/20 shrink-0"
                          onClick={dismissBanner}
                          aria-label="Dismiss banner"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </Alert>
                    </div>
                  )}
                  <Toaster
                    position="bottom-center"
                    richColors
                    closeButton
                    toastOptions={{ className: 'mb-safe' }}
                  />

                  <main className="flex-1 w-full py-0 print:p-0 print:m-0 print:block print:flex-none">
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
