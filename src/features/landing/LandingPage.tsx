import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, MessageSquare, BarChart3, ArrowRight } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-8 md:py-12 space-y-8 md:space-y-12 px-4 md:px-0">
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          Master Your <span className="text-primary">Interview</span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground">
          Practice with AI personas from top companies. Get instant feedback with structural
          visualizations. Offline-first & Privacy-focused.
        </p>
        <div className="pt-4">
          <button
            onClick={() => navigate('/setup')}
            className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 transition-all transform hover:scale-105"
          >
            Start Practice Now
            <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-5xl w-full">
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border flex flex-col items-center text-center">
          <div className="p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-full mb-4">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-bold mb-2 text-foreground">Tailored Scenarios</h3>
          <p className="text-muted-foreground text-sm">
            Upload your resume and JD. The AI adapts its persona to your specific target role.
          </p>
        </div>
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border flex flex-col items-center text-center">
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-full mb-4">
            <MessageSquare className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold mb-2 text-foreground">Real-time Chat</h3>
          <p className="text-muted-foreground text-sm">
            Experience a natural conversation flow. Handle behavioral and technical questions.
          </p>
        </div>
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border flex flex-col items-center text-center">
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-full mb-4">
            <BarChart3 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold mb-2 text-foreground">Visual Feedback</h3>
          <p className="text-muted-foreground text-sm">
            Get deep insights and Mermaid charts analyzing your thought process structure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
