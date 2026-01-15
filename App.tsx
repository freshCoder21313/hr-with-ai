import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupRoom from './features/dashboard/SetupRoom';
import InterviewRoom from './features/interview/InterviewRoom';
import FeedbackView from './features/interview/FeedbackView';
import LandingPage from './features/landing/LandingPage';
import HistoryPage from './features/history/HistoryPage';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-gray-50 text-slate-900">
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
              <span className="bg-slate-900 text-white p-1 rounded">HR</span>
              <span>With-AI</span>
            </div>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <a href="#/" className="hover:text-blue-600 transition-colors">Home</a>
              <a href="#/history" className="hover:text-blue-600 transition-colors">History</a>
            </nav>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/setup" element={<SetupRoom />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/interview/:id" element={<InterviewRoom />} />
            <Route path="/feedback/:id" element={<FeedbackView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;