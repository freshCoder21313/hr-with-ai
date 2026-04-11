import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ApiKeyModal from '@/components/shared/ApiKeyModal';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from '@/components/shared/theme-provider';
import Header from '@/components/layout/Header';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';

// Lazy load features
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
  return (
    <ThemeProvider defaultTheme="system" storageKey="hr-ai-theme">
      <HelmetProvider>
        <TooltipProvider>
          <HashRouter>
            <div className="min-h-[100dvh] flex flex-col bg-background text-foreground pt-[var(--safe-top)] pb-[var(--safe-bottom)] pl-[var(--safe-left)] pr-[var(--safe-right)] print:block print:bg-white print:min-h-0">
              <ApiKeyModal />
              <Header />

              <Toaster position="bottom-center" toastOptions={{ className: 'mb-safe' }} />

              <main className="flex-1 container mx-auto px-0 md:px-4 py-0 md:py-6 print:p-0 print:m-0 print:max-w-none print:block print:flex-none">
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
          </HashRouter>
        </TooltipProvider>
      </HelmetProvider>
    </ThemeProvider>
  );
};

export default App;
