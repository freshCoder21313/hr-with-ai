import React, { Suspense, lazy, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ApiKeyModal from './components/ApiKeyModal';
import { Loader2, Cloud } from 'lucide-react';
import { CloudSyncModal } from './components/CloudSyncModal';

// Lazy load features
const SetupRoom = lazy(() => import('./features/dashboard/SetupRoom'));
const InterviewRoom = lazy(() => import('./features/interview/InterviewRoom'));
const FeedbackView = lazy(() => import('./features/interview/FeedbackView'));
const ResumeBuilder = lazy(() => import('./features/resume-builder/ResumeBuilder'));
const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const HistoryPage = lazy(() => import('./features/history/HistoryPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);

const App: React.FC = () => {
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const handleResetKey = () => {
    if (window.confirm('Remove API Key and reload?')) {
      localStorage.removeItem('gemini_api_key');
      window.location.reload();
    }
  };

  return (
    <HashRouter>
      <div className="min-h-[100dvh] flex flex-col bg-slate-50 text-slate-900 pt-[var(--safe-top)] pb-[var(--safe-bottom)] pl-[var(--safe-left)] pr-[var(--safe-right)]">
        <ApiKeyModal />
        <CloudSyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />

        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
              <a href="#">
                <span className="bg-slate-900 text-white p-1 rounded">HR</span>
                <span>With-AI</span>
              </a>
            </div>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <a href="#/" className="hover:text-blue-600 transition-colors">
                Home
              </a>
              <a href="#/history" className="hover:text-blue-600 transition-colors">
                History
              </a>
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="hover:text-blue-600 transition-colors flex items-center gap-1"
                title="Cloud Sync"
              >
                <Cloud className="w-4 h-4" />
                <span className="hidden sm:inline">Sync</span>
              </button>
              <button
                onClick={handleResetKey}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="Reset API Key"
              >
                Key
              </button>
            </nav>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-0 md:px-4 py-0 md:py-6">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/setup" element={<SetupRoom />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/resumes/:id/edit" element={<ResumeBuilder />} />
              <Route path="/interview/:id" element={<InterviewRoom />} />
              <Route path="/feedback/:id" element={<FeedbackView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
