import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, MessageSquare, BarChart3, ArrowRight, CheckCircle } from 'lucide-react';
import SEO from '@/components/shared/SEO';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-12 space-y-16 px-4 md:px-6 overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-0 z-[-2] h-screen w-screen bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(0,0,0,0))]"></div>

      <SEO
        title="HR With AI - Master Your Interview"
        description="Practice with AI personas from top companies. Get instant feedback with structural visualizations."
      />

      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl pt-10">
        <div
          className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-4 cursor-pointer"
          onClick={() => navigate('/skill-assessment')}
        >
          🚀 New Feature: Skill Assessment
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-tight">
          Master Your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">
            Interview
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
          Practice with AI personas from top companies. Get instant feedback with structural
          visualizations. Offline-first & Privacy-focused.
        </p>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/setup')}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-medium rounded-full shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 transition-all motion-safe:transform motion-safe:hover:scale-105"
          >
            Start Practice Now
            <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
          </button>
          <button
            onClick={() => navigate('/skill-assessment')}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 border border-input bg-background hover:bg-accent hover:text-accent-foreground text-base font-medium rounded-full shadow-sm transition-all"
          >
            Take Skill Assessment
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full z-10 pb-12">
        <div
          className="bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border/50 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10 flex flex-col items-center text-center group cursor-pointer"
          onClick={() => navigate('/studio')}
        >
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-foreground">Tailored Scenarios</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Upload your resume and JD. The AI adapts its persona to your specific target role.
          </p>
        </div>
        <div
          className="bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border/50 hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-500/10 flex flex-col items-center text-center group cursor-pointer"
          onClick={() => navigate('/setup')}
        >
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
            <MessageSquare className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-foreground">Real-time Chat</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Experience a natural conversation flow. Handle behavioral and technical questions.
          </p>
        </div>
        <div
          className="bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border/50 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10 flex flex-col items-center text-center group cursor-pointer"
          onClick={() => navigate('/history')}
        >
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
            <BarChart3 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-foreground">Visual Feedback</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Get deep insights and Mermaid charts analyzing your thought process structure.
          </p>
        </div>
        <div
          className="bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border/50 hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10 flex flex-col items-center text-center group cursor-pointer"
          onClick={() => navigate('/skill-assessment')}
        >
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
            <CheckCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-foreground">Skill Assessment</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Extract skills from your CV and take AI-generated quick quizzes to validate your
            knowledge.
          </p>
        </div>
      </div>

      {/* Simple Footer Placeholder */}
      <footer className="mt-auto py-6 text-center text-sm text-muted-foreground">
        Powered by local-first AI processing.
      </footer>
    </div>
  );
};

export default LandingPage;
