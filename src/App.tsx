import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ApiKeyModal from './components/ApiKeyModal';
import { Loader2 } from 'lucide-react';

// Lazy load features
const SetupRoom = lazy(() => import('./features/dashboard/SetupRoom'));
const InterviewRoom = lazy(() => import('./features/interview/InterviewRoom'));
const FeedbackView = lazy(() => import('./features/interview/FeedbackView'));
const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const HistoryPage = lazy(() => import('./features/history/HistoryPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);

const App: React.FC = () => {
  const handleResetKey = () => {
    if (window.confirm('Remove API Key and reload?')) {
      localStorage.removeItem('gemini_api_key');
      window.location.reload();
    }
  };

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-gray-50 text-slate-900">
        <ApiKeyModal />
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
              <span className="bg-slate-900 text-white p-1 rounded">HR</span>
              <span>With-AI</span>
            </div>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <a href="#/" className="hover:text-blue-600 transition-colors">Home</a>
              <a href="#/history" className="hover:text-blue-600 transition-colors">History</a>
              <button onClick={handleResetKey} className="text-slate-400 hover:text-red-500 transition-colors" title="Reset API Key">
                Key
              </button>
            </nav>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-6">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/setup" element={<SetupRoom />} />
              <Route path="/history" element={<HistoryPage />} />
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