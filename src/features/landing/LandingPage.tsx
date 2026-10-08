import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Target,
  Sparkles,
  Bot,
  Award,
  Play,
  RotateCcw,
  CheckCircle2,
  Building,
  ChevronRight,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { db } from '@/lib/db';
import SEO from '@/components/shared/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Interview, InterviewStatus, Resume } from '@/types';

interface DashboardStats {
  interviews: number;
  resumes: number;
  assessments: number;
  hours: number;
  avgScore: number | null;
}

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    interviews: 0,
    resumes: 0,
    assessments: 0,
    hours: 0,
    avgScore: null,
  });
  const [recentInterviews, setRecentInterviews] = useState<Interview[]>([]);
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [inProgressInterview, setInProgressInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadDashboardData = async () => {
      try {
        const [interviewsCount, resumesCount, assessmentsCount, recentList, allResumes, mainCv] =
          await Promise.all([
            db.interviews.count(),
            db.resumes.count(),
            db.skillAssessments ? db.skillAssessments.count() : Promise.resolve(0),
            db.getInterviewsPage(0, 5),
            db.resumes.toArray(),
            db.getMainCV(),
          ]);

        if (!mounted) return;

        // Calculate average score for completed sessions with feedback
        const completedWithFeedback = recentList.filter(
          (i) => i.status === InterviewStatus.COMPLETED && typeof i.feedback?.score === 'number'
        );
        const avgScore =
          completedWithFeedback.length > 0
            ? Math.round(
                (completedWithFeedback.reduce((acc, i) => acc + (i.feedback?.score || 0), 0) /
                  completedWithFeedback.length) *
                  10
              ) / 10
            : null;

        // Find active/unfinished interview if any
        const inProgress = recentList.find((i) => i.status === InterviewStatus.IN_PROGRESS) || null;

        // Identify active resume (main CV or newest modified)
        let chosenResume = mainCv || null;
        if (!chosenResume && allResumes.length > 0) {
          chosenResume = allResumes.sort(
            (a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
          )[0];
        }

        setStats({
          interviews: interviewsCount,
          resumes: resumesCount,
          assessments: assessmentsCount,
          hours: Math.round(interviewsCount * 0.5 * 10) / 10,
          avgScore,
        });
        setRecentInterviews(recentList.slice(0, 3));
        setInProgressInterview(inProgress);
        setActiveResume(chosenResume);
      } catch {
        // Fallback gracefully on background fetch error
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadDashboardData();
    return () => {
      mounted = false;
    };
  }, []);

  const isReturningUser = stats.interviews > 0 || stats.resumes > 0 || stats.assessments > 0;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Recent';
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50dvh]" role="status">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="sr-only">Loading dashboard…</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col pb-24 md:pb-12 px-4 md:px-8 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute top-0 z-[-2] h-screen w-screen bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.1),rgba(0,0,0,0))]" />

      <SEO
        title="HR With AI — Smart Interview Copilot & Resume Studio"
        description="Practice with AI personas from top companies. Get instant feedback with structural visualizations."
      />

      {isReturningUser ? (
        /* RETURNING USER: HYBRID COMMAND DASHBOARD */
        <div className="max-w-6xl w-full mx-auto space-y-8 pt-6">
          {/* Welcome & Overview */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                AI Career Copilot Ready
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                Welcome Back 👋
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                Here is your interview training summary and active drafts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={() => navigate('/setup')} className="gap-2 shadow-sm font-medium">
                <Play className="w-4 h-4 fill-current" />
                New Practice
              </Button>
              <Button variant="outline" onClick={() => navigate('/studio')} className="gap-2">
                <FileText className="w-4 h-4" />
                CV Studio
              </Button>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Interviews
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.interviews}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stats.hours} hrs total</p>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Average Score
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {stats.avgScore !== null ? `${stats.avgScore}/10` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Recent feedback</p>
                </div>
                <div className="p-3 bg-success/10 text-success rounded-xl">
                  <Target className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    CVs Stored
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.resumes}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeResume ? activeResume.fileName : 'No main CV'}
                  </p>
                </div>
                <div className="p-3 bg-info/10 text-info rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Skills Assessed
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.assessments}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Quizzes completed</p>
                </div>
                <div className="p-3 bg-warning/10 text-warning rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Jump Back In / Active Draft Card */}
          {inProgressInterview ? (
            <Card className="border-warning/40 bg-warning/5 backdrop-blur-sm shadow-sm">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-warning/20 text-warning rounded-lg mt-0.5">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-warning">
                        In Progress Session
                      </span>
                      <Badge
                        variant="outline"
                        className="border-warning/40 text-warning text-[10px]"
                      >
                        Unfinished
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mt-1">
                      {inProgressInterview.jobTitle} at {inProgressInterview.company}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Started on {formatDate(inProgressInterview.createdAt)} •{' '}
                      {inProgressInterview.messages.length} messages exchanged
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/interview/${inProgressInterview.id}`)}
                  className="bg-warning text-warning-foreground hover:bg-warning/90 shrink-0 font-medium"
                >
                  Resume Interview <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </CardContent>
            </Card>
          ) : recentInterviews.length > 0 && recentInterviews[0].feedback ? (
            <Card className="border-primary/20 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-lg mt-0.5">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Latest Completed Session
                    </span>
                    <h3 className="text-lg font-bold text-foreground mt-1">
                      {recentInterviews[0].jobTitle} at {recentInterviews[0].company}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Completed on {formatDate(recentInterviews[0].createdAt)} • Feedback Score:{' '}
                      <span className="font-semibold text-foreground">
                        {recentInterviews[0].feedback?.score}/10
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/feedback/${recentInterviews[0].id}`)}
                  className="shrink-0"
                >
                  View Full Feedback <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* Quick Action Hub */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => navigate('/setup')}
                className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-md text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="p-3 bg-primary/10 text-primary rounded-xl w-fit mb-3 group-hover:scale-105 transition-transform">
                  <Bot className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-foreground text-base">Mock Interview</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Practice with adaptive AI personas tailored to your JD.
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate('/studio')}
                className="p-5 rounded-2xl bg-card border border-border hover:border-info/50 transition-all hover:shadow-md text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="p-3 bg-info/10 text-info rounded-xl w-fit mb-3 group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-foreground text-base">CV Studio</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Tailor CVs for job listings & chat with AI resume copilot.
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate('/skill-assessment')}
                className="p-5 rounded-2xl bg-card border border-border hover:border-warning/50 transition-all hover:shadow-md text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="p-3 bg-warning/10 text-warning rounded-xl w-fit mb-3 group-hover:scale-105 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-foreground text-base">Skill Assessment</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Extract skills from CV and take AI-generated quizzes.
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate('/history')}
                className="p-5 rounded-2xl bg-card border border-border hover:border-success/50 transition-all hover:shadow-md text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="p-3 bg-success/10 text-success rounded-xl w-fit mb-3 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-foreground text-base">Progress & History</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Inspect radar charts, question history, and growth analytics.
                </p>
              </button>
            </div>
          </div>

          {/* Recent Activity List */}
          {recentInterviews.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Recent Sessions</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/history')}
                  className="text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  View All History <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-3">
                {recentInterviews.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.status === InterviewStatus.COMPLETED) {
                        navigate(`/feedback/${item.id}`);
                      } else {
                        navigate(`/interview/${item.id}`);
                      }
                    }}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-border/80 hover:bg-muted/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                        <Building className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {item.jobTitle}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{item.company}</span>
                          <span>•</span>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.feedback?.score !== undefined ? (
                        <Badge
                          variant="outline"
                          className={
                            item.feedback.score >= 8
                              ? 'bg-success/10 text-success border-success/30'
                              : item.feedback.score >= 6
                                ? 'bg-warning/10 text-warning border-warning/30'
                                : 'bg-destructive/10 text-destructive border-destructive/30'
                          }
                        >
                          {item.feedback.score}/10
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {item.status === InterviewStatus.IN_PROGRESS
                            ? 'In Progress'
                            : 'Completed'}
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* FIRST-TIME USER: ENGAGING HERO & FEATURE WALKTHROUGH */
        <div className="max-w-6xl w-full mx-auto space-y-16 pt-10 flex flex-col items-center">
          {/* Hero Section */}
          <div className="text-center space-y-6 max-w-3xl">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring border-primary/20 bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
              onClick={() => navigate('/skill-assessment')}
            >
              <Sparkles className="w-3.5 h-3.5" />
              New Feature: AI Skill Assessment & Quiz
            </button>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
              Master Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-info">
                Interview
              </span>{' '}
              & Perfect Your CV
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Practice realistic mock interviews with AI personas from top tech companies. Tailor
              your resume against real JDs with offline-first privacy.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/setup')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full shadow-md text-base font-medium motion-safe:hover:scale-105 transition-all"
              >
                Start Practice Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/studio')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full shadow-sm text-base font-medium transition-all"
              >
                Open CV Studio
              </Button>
            </div>
          </div>

          {/* 3-Step Guided Walkthrough */}
          <div className="w-full max-w-4xl">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-foreground">How It Works in 3 Steps</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Zero setup required. Your data remains 100% private in your browser.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card/60 backdrop-blur-sm border-border">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold mb-2">
                    1
                  </div>
                  <CardTitle className="text-base">Upload or Choose Role</CardTitle>
                  <CardDescription className="text-xs">
                    Paste the target job description or import your resume to establish context.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-card/60 backdrop-blur-sm border-border">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center font-bold mb-2">
                    2
                  </div>
                  <CardTitle className="text-base">Realistic AI Interview</CardTitle>
                  <CardDescription className="text-xs">
                    Engage in dynamic behavioral, technical, or coding sessions with voice/text.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-card/60 backdrop-blur-sm border-border">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center font-bold mb-2">
                    3
                  </div>
                  <CardTitle className="text-base">Get Structural Feedback</CardTitle>
                  <CardDescription className="text-xs">
                    Receive detailed diagnostic scores, STAR alignment, and thought structure
                    graphs.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Key Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            <div
              onClick={() => navigate('/studio')}
              className="bg-card/50 p-6 rounded-2xl border border-border hover:border-info/50 transition-all hover:shadow-lg flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="p-4 bg-info/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-7 w-7 text-info" />
              </div>
              <h4 className="font-bold text-base text-foreground mb-1">Tailored Resumes</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Analyze JD match rate and optimize your CV sections automatically.
              </p>
            </div>

            <div
              onClick={() => navigate('/setup')}
              className="bg-card/50 p-6 rounded-2xl border border-border hover:border-primary/50 transition-all hover:shadow-lg flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="p-4 bg-primary/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-7 w-7 text-primary" />
              </div>
              <h4 className="font-bold text-base text-foreground mb-1">Real-time Simulation</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Live AI questioning with adaptive hints and interviewer personalities.
              </p>
            </div>

            <div
              onClick={() => navigate('/skill-assessment')}
              className="bg-card/50 p-6 rounded-2xl border border-border hover:border-warning/50 transition-all hover:shadow-lg flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="p-4 bg-warning/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-7 w-7 text-warning" />
              </div>
              <h4 className="font-bold text-base text-foreground mb-1">Skill Assessment</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Test hard and soft skills extracted from your CV with instant evaluation.
              </p>
            </div>

            <div
              onClick={() => navigate('/history')}
              className="bg-card/50 p-6 rounded-2xl border border-border hover:border-success/50 transition-all hover:shadow-lg flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="p-4 bg-success/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-7 w-7 text-success" />
              </div>
              <h4 className="font-bold text-base text-foreground mb-1">Visual Growth</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Track your historical performance, confidence metrics, and radar charts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto pt-12 pb-4 text-center text-xs text-muted-foreground">
        Local-first AI processing • Your data stays on your device
      </footer>
    </div>
  );
};

export default LandingPage;
