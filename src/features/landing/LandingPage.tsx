import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Clock,
  Target,
  Zap,
  BookOpen,
  Users,
  TrendingUp,
} from 'lucide-react';
import { db } from '@/lib/db';
import SEO from '@/components/shared/SEO';
import { Button } from '@/components/ui/button';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ interviews: 0, resumes: 0, hours: 0 });

  useEffect(() => {
    const loadStats = async () => {
      const interviews = await db.interviews.count();
      const resumes = await db.resumes.count();
      setStats({
        interviews,
        resumes,
        hours: Math.round(interviews * 0.5 * 10) / 10,
      });
    };
    loadStats();
  }, []);

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
        <button
          type="button"
          className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-4 cursor-pointer"
          onClick={() => navigate('/skill-assessment')}
        >
          🚀 New Feature: Skill Assessment
        </button>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-tight">
          Master Your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-info">
            Interview
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
          Practice with AI personas from top companies. Get instant feedback with structural
          visualizations. Offline-first & Privacy-focused.
        </p>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={() => navigate('/setup')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full shadow-sm text-base font-medium motion-safe:transform motion-safe:hover:scale-105 transition-all"
          >
            Start Practice Now
            <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/skill-assessment')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full shadow-sm text-base font-medium transition-all"
          >
            Take Skill Assessment
          </Button>
        </div>
      </div>

      {/* Quick Stats — replaced with a welcome note on first visit to avoid an all-zero wall */}
      {stats.interviews === 0 && stats.resumes === 0 ? (
        <div className="w-full max-w-3xl z-10 text-center rounded-xl bg-card/30 border border-border/30 p-6">
          <p className="text-base font-semibold text-foreground">Your journey starts here</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run your first mock interview or upload a resume — your progress stats will appear here
            as you go.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl z-10">
          <div className="flex flex-col items-center p-4 rounded-xl bg-card/30 border border-border/30">
            <Clock className="h-5 w-5 text-info mb-2" />
            <span className="text-2xl font-bold">{stats.interviews}</span>
            <span className="text-xs text-muted-foreground">Interviews</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-xl bg-card/30 border border-border/30">
            <Target className="h-5 w-5 text-primary mb-2" />
            <span className="text-2xl font-bold">{stats.hours}</span>
            <span className="text-xs text-muted-foreground">Hours Practiced</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-xl bg-card/30 border border-border/30">
            <FileText className="h-5 w-5 text-success mb-2" />
            <span className="text-2xl font-bold">{stats.resumes}</span>
            <span className="text-xs text-muted-foreground">Resumes</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-xl bg-card/30 border border-border/30">
            <Zap className="h-5 w-5 text-warning mb-2" />
            <span className="text-2xl font-bold">{stats.resumes > 0 ? '✓' : '-'}</span>
            <span className="text-xs text-muted-foreground">AI Analyzed</span>
          </div>
        </div>
      )}

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl z-10">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-card/30 border border-border/30">
          <BookOpen className="h-5 w-5 text-info shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-sm">Learn by Doing</h4>
            <p className="text-xs text-muted-foreground">
              Practice real scenarios, not just reading
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-card/30 border border-border/30">
          <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-sm">Personalized Feedback</h4>
            <p className="text-xs text-muted-foreground">AI adapts to your target role</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-card/30 border border-border/30">
          <TrendingUp className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-sm">Track Progress</h4>
            <p className="text-xs text-muted-foreground">Visual charts show improvement</p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full z-10 pb-12">
        <Link
          to="/studio"
          className="w-full text-left bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border/50 hover:border-info/50 transition-all hover:shadow-lg hover:shadow-info/10 flex flex-col items-center text-center group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="p-4 bg-info/10 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
            <FileText className="h-8 w-8 text-info" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-foreground">Tailored Scenarios</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Upload your resume and JD. The AI adapts its persona to your specific target role.
          </p>
        </Link>
        <Link
          to="/setup"
          className="w-full text-left bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 flex flex-col items-center text-center group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="p-4 bg-primary/10 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-foreground">Real-time Chat</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Experience a natural conversation flow. Handle behavioral and technical questions.
          </p>
        </Link>
        <Link
          to="/history"
          className="w-full text-left bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border/50 hover:border-success/50 transition-all hover:shadow-lg hover:shadow-success/10 flex flex-col items-center text-center group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="p-4 bg-success/10 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
            <BarChart3 className="h-8 w-8 text-success" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-foreground">Visual Feedback</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Get deep insights and Mermaid charts analyzing your thought process structure.
          </p>
        </Link>
        <Link
          to="/skill-assessment"
          className="w-full text-left bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border/50 hover:border-warning/50 transition-all hover:shadow-lg hover:shadow-warning/10 flex flex-col items-center text-center group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="p-4 bg-warning/10 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
            <CheckCircle className="h-8 w-8 text-warning" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-foreground">Skill Assessment</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Extract skills from your CV and take AI-generated quick quizzes to validate your
            knowledge.
          </p>
        </Link>
      </div>

      {/* Simple Footer Placeholder */}
      <footer className="mt-auto py-6 text-center text-sm text-muted-foreground">
        Powered by local-first AI processing.
      </footer>
    </div>
  );
};

export default LandingPage;
