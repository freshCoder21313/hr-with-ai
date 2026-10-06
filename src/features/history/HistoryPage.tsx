import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Building,
  Briefcase,
  Download,
  Plus,
  ArrowRight,
  Clock,
  Award,
  Trash2,
  Search,
  GraduationCap,
  Share2,
} from 'lucide-react';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { Interview, SkillAssessmentRecord } from '@/types';
import { notificationService } from '@/services/core/notificationService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import LearningPath from './LearningPath';
import SEO from '@/components/shared/SEO';
import ShareModal from './components/ShareModal';

const ProgressCharts = React.lazy(() => import('./ProgressCharts'));
const SkillRadarChart = React.lazy(() => import('./SkillRadarChart'));

const PAGE_SIZE = 20;

const HistoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'interviews' | 'assessments'>('interviews');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [assessments, setAssessments] = useState<SkillAssessmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssessmentsLoading, setIsAssessmentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [page, total] = await Promise.all([
          db.getInterviewsPage(0, PAGE_SIZE),
          db.interviews.count(),
        ]);
        setInterviews(page);
        setTotalCount(total);
        setHasMore(page.length === PAGE_SIZE);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const fetchAssessments = useCallback(async () => {
    if (!db.skillAssessments?.orderBy) return;
    setIsAssessmentsLoading(true);
    try {
      const records = await db.skillAssessments.orderBy('createdAt').reverse().toArray();
      setAssessments(records);
    } catch (err) {
      logger.error('Failed to load skill assessments:', err);
    } finally {
      setIsAssessmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'assessments') {
      fetchAssessments();
    }
  }, [activeTab, fetchAssessments]);

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const page = await db.getInterviewsPage(interviews.length, PAGE_SIZE);
      setInterviews((prev) => [...prev, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  }, [interviews.length]);

  const stats = useMemo(
    () => ({
      total: interviews.length,
      companies: new Set(interviews.map((i) => i.company)).size,
      avgScore:
        interviews.length > 0
          ? Math.round(
              (interviews
                .filter((i) => i.feedback?.score)
                .reduce((sum, i) => sum + (i.feedback?.score || 0), 0) /
                interviews.filter((i) => i.feedback?.score).length) *
                10
            ) / 10
          : 0,
      hours: Math.round(interviews.length * 0.5 * 10) / 10,
    }),
    [interviews]
  );

  const handleExport = (interview: Interview, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(interview, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute(
      'download',
      `interview_${interview.company}_${new Date(interview.createdAt).toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleDeleteInterview = async (interviewId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await notificationService.confirm({
      title: 'Delete Interview',
      message: 'Are you sure you want to delete this interview session?',
      variant: 'destructive',
    });
    if (confirmed) {
      await db.interviews.delete(interviewId);
      setInterviews((prev) => prev.filter((i) => i.id !== interviewId));
      setTotalCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleDeleteAssessment = async (assessmentId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await notificationService.confirm({
      title: 'Delete Assessment',
      message: 'Are you sure you want to delete this skill assessment record?',
      variant: 'destructive',
    });
    if (confirmed) {
      await db.skillAssessments.delete(assessmentId);
      setAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
    }
  };

  const filteredInterviews = useMemo(() => {
    if (!searchQuery.trim()) return interviews;
    const q = searchQuery.toLowerCase().trim();
    return interviews.filter(
      (interview) =>
        interview.company.toLowerCase().includes(q) || interview.jobTitle.toLowerCase().includes(q)
    );
  }, [interviews, searchQuery]);

  const filteredAssessments = useMemo(() => {
    if (!searchQuery.trim()) return assessments;
    const q = searchQuery.toLowerCase().trim();
    return assessments.filter((record) => record.skill.toLowerCase().includes(q));
  }, [assessments, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <SEO
        title="History - HR With AI"
        description="Track your interview progress and skill assessment history. Analyze your improvement over time."
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {activeTab === 'interviews' ? 'Interview History' : 'Skill Assessment History'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeTab === 'interviews'
              ? 'Track your progress and review past sessions'
              : 'Review your quiz results and skill proficiencies'}
          </p>
        </div>
        <Button
          onClick={() => navigate(activeTab === 'interviews' ? '/setup' : '/skill-assessment')}
          className="gap-2"
        >
          <Plus size={16} />
          {activeTab === 'interviews' ? 'New Session' : 'New Assessment'}
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as 'interviews' | 'assessments');
          setSearchQuery('');
        }}
        className="w-full"
      >
        <TabsList className="grid w-full sm:w-auto grid-cols-2 mb-6">
          <TabsTrigger value="interviews" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Mock Interviews
          </TabsTrigger>
          <TabsTrigger value="assessments" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Skill Assessments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interviews" className="space-y-6">
          {/* Stats Summary */}
          {interviews.length > 0 && (
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-full font-medium">
                  Showing analytics for {interviews.length} of {totalCount} loaded sessions
                  {hasMore ? ' — Load more to expand' : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-lg bg-card border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Briefcase className="h-4 w-4" />
                    <span>Total Sessions</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Building className="h-4 w-4" />
                    <span>Companies</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.companies}</div>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Award className="h-4 w-4" />
                    <span>Avg Score</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.avgScore || '-'}</div>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Hours</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.hours}</div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Charts Section */}
          {interviews.length > 0 && (
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <React.Suspense
                fallback={
                  <div className="h-48 flex items-center justify-center bg-card rounded-lg border border-border animate-pulse">
                    Loading charts...
                  </div>
                }
              >
                <ProgressCharts interviews={interviews} />
                <div className="flex flex-col gap-8 w-full">
                  <div className="w-full">
                    <SkillRadarChart interviews={interviews} />
                  </div>
                  <div className="w-full">
                    <LearningPath interviews={interviews} />
                  </div>
                </div>
              </React.Suspense>
            </div>
          )}

          {/* Search/Filter Bar */}
          {interviews.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by company or job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search interviews"
              />
            </div>
          )}

          {isLoading ? (
            <div className="grid gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : interviews.length === 0 ? (
            <EmptyState
              icon={
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <Briefcase className="text-muted-foreground" />
                </div>
              }
              title="No interviews recorded yet"
              message="Start your first mock interview to get AI-powered feedback and improve your skills."
              action={
                <Button variant="outline" onClick={() => navigate('/setup')}>
                  Start your first session
                </Button>
              }
            />
          ) : filteredInterviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No interviews match &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredInterviews.map((interview) => (
                <Card
                  key={interview.id}
                  onClick={() =>
                    navigate(
                      interview.status === 'completed'
                        ? `/feedback/${interview.id}`
                        : `/interview/${interview.id}`
                    )
                  }
                  className="hover:shadow-md transition-all cursor-pointer group border-border hover:border-primary/50 bg-card"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between md:justify-start gap-4">
                          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                            {interview.company}
                          </h3>
                          {interview.feedback && (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border
                                    ${
                                      interview.feedback.score >= 8
                                        ? 'bg-success/10 text-success border-success/20'
                                        : 'bg-info/10 text-info border-info/20'
                                    }`}
                            >
                              Score: {interview.feedback.score}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center text-muted-foreground gap-4 text-sm">
                          <span className="flex items-center bg-muted px-2 py-1 rounded">
                            <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                            {interview.jobTitle}
                          </span>
                          <span className="flex items-center bg-muted px-2 py-1 rounded capitalize">
                            <Building className="w-3.5 h-3.5 mr-1.5" />
                            {interview.status.replace('_', ' ')}
                          </span>
                          <span className="flex items-center bg-muted px-2 py-1 rounded">
                            <Calendar className="w-3.5 h-3.5 mr-1.5" />
                            {new Date(interview.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-border">
                        <div onClick={(e) => e.stopPropagation()}>
                          <ShareModal
                            interview={interview}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-primary gap-1"
                              >
                                <Share2 size={14} />
                                Share
                              </Button>
                            }
                          />
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleExport(interview, e)}
                              className="text-muted-foreground hover:text-primary gap-1"
                            >
                              <Download size={14} />
                              Export
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Export as JSON</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete interview"
                              onClick={(e) =>
                                interview.id !== undefined && handleDeleteInterview(interview.id, e)
                              }
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Interview</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="View interview details"
                              className="text-muted-foreground group-hover:text-primary ml-auto md:ml-0"
                            >
                              <ArrowRight size={20} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Details</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="mt-4 flex flex-col items-center gap-2">
                {hasMore && !searchQuery.trim() && (
                  <LoadingButton
                    variant="outline"
                    onClick={loadMore}
                    isLoading={isLoadingMore}
                    loadingText="Loading…"
                    className="w-full"
                  >
                    Load more
                  </LoadingButton>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="assessments" className="space-y-6">
          {/* Search/Filter Bar for Assessments */}
          {assessments.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by skill name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search skill assessments"
              />
            </div>
          )}

          {isAssessmentsLoading ? (
            <div className="grid gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : assessments.length === 0 ? (
            <EmptyState
              icon={
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <GraduationCap className="text-muted-foreground" />
                </div>
              }
              title="No skill assessments recorded yet"
              message="Take a quiz to test your technical skills and discover areas to improve."
              action={
                <Button variant="outline" onClick={() => navigate('/skill-assessment')}>
                  Take a Skill Assessment
                </Button>
              }
            />
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No skill assessments match &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAssessments.map((assessment) => {
                const isPassing = assessment.score >= 70;
                return (
                  <Card
                    key={assessment.id}
                    className="hover:shadow-md transition-all group border-border bg-card"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center justify-between md:justify-start gap-4">
                            <h3 className="text-xl font-bold text-foreground">
                              {assessment.skill}
                            </h3>
                            <span
                              className={cn(
                                'px-2.5 py-0.5 rounded-full text-xs font-bold border',
                                isPassing
                                  ? 'bg-success/10 text-success border-success/20'
                                  : 'bg-warning/10 text-warning border-warning/30'
                              )}
                            >
                              Score: {assessment.score}%
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center text-muted-foreground gap-4 text-sm">
                            <span className="flex items-center bg-muted px-2 py-1 rounded">
                              <Award className="w-3.5 h-3.5 mr-1.5" />
                              {assessment.totalQuestions} Questions
                            </span>
                            <span className="flex items-center bg-muted px-2 py-1 rounded">
                              <Calendar className="w-3.5 h-3.5 mr-1.5" />
                              {new Date(assessment.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {assessment.weaknesses && assessment.weaknesses.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-xs text-muted-foreground font-medium">
                                Weaknesses:
                              </span>
                              {assessment.weaknesses.map((weakness, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded-md font-medium"
                                >
                                  {weakness}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground pt-1">
                              No weak areas identified — excellent work!
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-border">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete skill assessment"
                                onClick={(e) =>
                                  assessment.id !== undefined &&
                                  handleDeleteAssessment(assessment.id, e)
                                }
                                className="text-muted-foreground hover:text-destructive ml-auto md:ml-0"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete Assessment</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoryPage;
