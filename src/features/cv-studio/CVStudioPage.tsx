import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { Resume, Message } from '@/types';
import { ResumeData } from '@/types/resume';
import { ChatArea } from '@/features/interview/components/ChatArea';
import { SimpleInputArea } from '@/components/shared/SimpleInputArea';
import { streamCVChatMessage } from '@/services/cvChatService';
import { extractProposedChanges, ProposedChange } from './utils/cvChatUtils';
import ResumePreview from '@/features/resume-builder/ResumePreview';
import { ChangeReviewCard } from './components/ChangeReviewCard';
import { ResumeFormView } from './components/ResumeFormView';
import { GitHubImportModal } from '@/features/resume-builder/github-import/GitHubImportModal';
import SectionReorderDialog from '@/features/resume-builder/components/SectionReorderDialog';
import BasicsForm from '@/features/resume-builder/SectionForms/BasicsForm';
import WorkForm from '@/features/resume-builder/SectionForms/WorkForm';
import EducationForm from '@/features/resume-builder/SectionForms/EducationForm';
import SkillsForm from '@/features/resume-builder/SectionForms/SkillsForm';
import ProjectsForm from '@/features/resume-builder/SectionForms/ProjectsForm';
import { EditGlobalPromptModal } from './components/EditGlobalPromptModal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useJobStore, Job } from './stores/useJobStore';
import { getStoredAIConfig, tailorResumeV2, parseResumeToJSON } from '@/services/geminiService';
import { ROOT_PROMPT } from '@/services/ai/rootPrompt';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SEO from '@/components/SEO';
import {
    PanelLeftClose,
    PanelLeftOpen,
    Briefcase,
    Plus,
    Trash2,
    Play,
    Wand2,
    CheckCircle2,
    AlertCircle,
    Download,
    Upload,
    Settings,
    Eye,
    Edit3,
    LayoutTemplate,
    Github,
    MessageSquare,
    Loader2,
    ChevronDown,
    ChevronUp,
    Columns,
    List,
    Printer,
    Palette,
    Type as TypeIcon,
    FileEdit,
    FileSearch,
    Target
} from 'lucide-react';
import { openApiKeyModal } from '@/events/apiKeyEvents';

// ─── Types ───────────────────────────────────────────────────────────────────

type JobProcessStatus = 'idle' | 'processing' | 'completed' | 'error';

interface JobWithStatus extends Job {
    status: JobProcessStatus;
    resultId?: number;
    error?: string;
}

const ALLOWED_SECTIONS = [
    'basics', 'work', 'education', 'skills', 'projects',
    'languages', 'interests', 'references', 'volunteer',
    'awards', 'publications', 'meta',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** One compact job card shown in the Job Panel */
const JobCard: React.FC<{
    job: Job;
    isSelected: boolean;
    status: Partial<JobWithStatus>;
    isProcessing: boolean;
    onSelect: (checked: boolean) => void;
    onRemove: () => void;
    onChange: (field: keyof Job, value: string) => void;
    onViewResult: (id: number) => void;
}> = ({ job, isSelected, status, isProcessing, onSelect, onRemove, onChange, onViewResult }) => {
    const [expanded, setExpanded] = useState(false);
    const isDone = status.status === 'completed';
    const isRunning = status.status === 'processing';
    const hasError = status.status === 'error';

    return (
        <div
            className={`rounded-lg border bg-card transition-all ${isRunning ? 'border-primary ring-1 ring-primary/20' : 'border-border'
                } ${isDone ? 'opacity-80' : ''}`}
        >
            {/* Header row */}
            <div className="flex items-center gap-2 px-3 py-2">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(c) => onSelect(!!c)}
                    disabled={isDone || isProcessing}
                    className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground">
                        {job.title || 'Untitled'}{job.company ? ` @ ${job.company}` : ''}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                        {job.description ? job.description.slice(0, 50) + '…' : 'No JD yet'}
                    </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {isDone && (
                        <Badge className="bg-green-500 hover:bg-green-600 text-[10px] h-5 px-1.5">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Done
                        </Badge>
                    )}
                    {hasError && (
                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                            <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> Err
                        </Badge>
                    )}
                    {isRunning && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                    <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={onRemove} disabled={isProcessing}
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                    <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 text-muted-foreground"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                </div>
            </div>

            {/* Expanded form */}
            {expanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-[10px]">Company</Label>
                            <Input
                                className="h-7 text-xs"
                                placeholder="Google"
                                value={job.company}
                                onChange={(e) => onChange('company', e.target.value)}
                                disabled={isDone || isProcessing}
                            />
                        </div>
                        <div>
                            <Label className="text-[10px]">Title</Label>
                            <Input
                                className="h-7 text-xs"
                                placeholder="SWE"
                                value={job.title}
                                onChange={(e) => onChange('title', e.target.value)}
                                disabled={isDone || isProcessing}
                            />
                        </div>
                    </div>
                    <div>
                        <Label className="text-[10px]">Job Description</Label>
                        <Textarea
                            className="min-h-[80px] text-xs font-mono"
                            placeholder="Paste JD here..."
                            value={job.description}
                            onChange={(e) => onChange('description', e.target.value)}
                            disabled={isDone || isProcessing}
                        />
                    </div>
                    <div>
                        <Label className="text-[10px]">Custom Prompt (optional)</Label>
                        <Textarea
                            className="min-h-[48px] text-xs"
                            placeholder="Emphasize React experience..."
                            value={job.customPrompt}
                            onChange={(e) => onChange('customPrompt', e.target.value)}
                            disabled={isDone || isProcessing}
                        />
                    </div>
                    {isDone && status.resultId && (
                        <Button
                            size="sm" variant="secondary"
                            className="w-full h-7 text-xs"
                            onClick={() => onViewResult(status.resultId!)}
                        >
                            View Tailored CV →
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const CVStudioPage: React.FC = () => {
    const navigate = useNavigate();

    // ── Layout State ────────────────────────────────────────────────────────────
    const [isJobPanelOpen, setIsJobPanelOpen] = useState(true);
    const [previewViewMode, setPreviewViewMode] = useState<'preview' | 'form' | 'split'>('preview');
    const [template, setTemplate] = useState<'modern' | 'classic' | 'creative' | 'minimalist' | 'academic'>('modern');
    const [activeTab, setActiveTab] = useState('basics');
    const [showReorderDialog, setShowReorderDialog] = useState(false);

    // ── Shared Data ─────────────────────────────────────────────────────────────
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ── CV Chat State ───────────────────────────────────────────────────────────
    const [mainCV, setMainCV] = useState<Resume | null>(null);
    const [chatResumeId, setChatResumeId] = useState<number | undefined>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<ProposedChange[] | null>(null);
    const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

    // ── CV Context State (for AI reference) ─────────────────────────────────────
    const [contextResumeId, setContextResumeId] = useState<number | undefined>();
    const [contextJobId, setContextJobId] = useState<string | undefined>();

    // ── Smart Tailor State ──────────────────────────────────────────────────────
    const jobs = useJobStore((s) => s.jobs);
    const globalPrompt = useJobStore((s) => s.globalPrompt);
    const jobActions = useJobStore((s) => s.actions);
    const [selectedResumeId, setSelectedResumeId] = useState<number | undefined>();
    const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
    const [processingStatus, setProcessingStatus] = useState<Record<string, Partial<JobWithStatus>>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

    // ── Load Data ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            try {
                const all = await db.resumes.toArray();
                const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
                setResumes(sorted);

                // For Tailor: pick main or first
                const main = sorted.find((r) => r.isMain) || sorted[0];
                if (main) setSelectedResumeId(main.id);

                // For Chat: pick main CV
                const cv = await db.getMainCV();
                if (cv) {
                    setMainCV(cv);
                    setChatResumeId(cv.id);
                    setMessages([{
                        role: 'model',
                        content: `Hello! I'm your CV assistant. Currently working on **${cv.fileName}**.\n\nSwitch to **Tailor mode** to auto-tailor this CV for specific jobs, or stay in **Chat mode** to edit it manually via AI chat.`,
                        timestamp: Date.now(),
                    }]);
                } else if (sorted.length > 0) {
                    // No main CV — just pick first
                    const first = sorted[0];
                    setMainCV(first);
                    setChatResumeId(first.id);
                    setMessages([{
                        role: 'model',
                        content: `Hello! Working on **${first.fileName}**. How can I help you today?`,
                        timestamp: Date.now(),
                    }]);
                }
            } catch (err) {
                console.error('Failed to load studio data', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // ── Chat Handlers ───────────────────────────────────────────────────────────
    const handleSendMessage = async (text: string, image?: string) => {
        if (!mainCV?.parsedData) return;
        const config = getStoredAIConfig();
        if (!config.apiKey) { openApiKeyModal(); return; }

        const userMsg: Message = { role: 'user', content: text, timestamp: Date.now(), image };
        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true);
        const aiMsgId = Date.now();
        setMessages((prev) => [...prev, { role: 'model', content: '', timestamp: aiMsgId }]);

        try {
            // Collect context from other resumes and jobs based on user selection
            let additionalContext = "";

            // 1. Explicit Reference CV
            if (contextResumeId) {
                const refCV = resumes.find(r => r.id === contextResumeId);
                if (refCV?.parsedData) {
                    additionalContext += `\nREFERENCE CV (Explicitly selected by user for source information):\n${JSON.stringify(refCV.parsedData, null, 2)}\n`;
                }
            } else {
                // Default fallback to Main CV if no explicit reference selected
                const mainCVData = resumes.find(r => r.isMain && r.id !== chatResumeId);
                if (mainCVData?.parsedData) {
                    additionalContext += `\nMAIN CV (Primary reference):\n${JSON.stringify(mainCVData.parsedData, null, 2)}\n`;
                }
            }

            // 2. Explicit Target Job
            if (contextJobId) {
                const targetJob = jobs.find(j => j.id === contextJobId);
                if (targetJob) {
                    additionalContext += `\nTARGET JOB DESCRIPTION (The goal/requirements the user is aiming for):\nTitle: ${targetJob.title}\nCompany: ${targetJob.company}\nDescription: ${targetJob.description}\n`;
                }
            }

            // 3. General awareness of other options
            const otherResumes = resumes.filter(r => r.id !== chatResumeId && r.id !== contextResumeId);
            if (otherResumes.length > 0) {
                additionalContext += `\nOTHER AVAILABLE CVs: ${otherResumes.map(r => r.fileName).join(", ")}\n`;
            }

            const stream = streamCVChatMessage(
                messages.concat(userMsg),
                text,
                mainCV.parsedData,
                config,
                additionalContext
            );
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setMessages((prev) => prev.map((m) => m.timestamp === aiMsgId ? { ...m, content: fullResponse } : m));
            }

            // After stream finishes, handle changes
            const changes = extractProposedChanges(fullResponse);

            // Clean up the message: Remove ANY markdown code blocks (even multiple) 
            // and trim excess whitespace/newlines.
            let cleaned = fullResponse.replace(/```[\s\S]*?```/g, '').trim();

            // If the message is only JSON or empty after cleaning, provide a default friendly text
            if (!cleaned || cleaned.length < 5) {
                cleaned = changes?.length
                    ? "I've analyzed your request and prepared some updates for your CV. Please review the changes above."
                    : "I've processed your request, but no specific data updates were proposed. Let me know if you'd like me to try again with more details.";
            }

            setMessages((prev) => prev.map((m) => m.timestamp === aiMsgId ? { ...m, content: cleaned } : m));

            if (changes?.length) {
                setPendingChanges((prev) => [...(prev || []), ...changes]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages((prev) => prev.map((m) => m.timestamp === aiMsgId
                ? { ...m, content: "Sorry, I encountered an error processing your request. Please check your connection and API key." }
                : m));
        } finally {
            setIsTyping(false);
        }
    };

    const handleAcceptChange = async (change: ProposedChange) => {
        if (!mainCV?.parsedData) return;
        const current = mainCV.parsedData[change.section];
        const isArrExp = Array.isArray(current);
        const isArrRec = Array.isArray(change.newData);
        if (current !== undefined && isArrExp !== isArrRec) {
            alert(`Type mismatch for ${change.section}`); return;
        }
        if (current === undefined && !ALLOWED_SECTIONS.includes(change.section)) {
            alert(`Invalid section: ${change.section}`); return;
        }
        const updated = { ...mainCV.parsedData, [change.section]: change.newData };
        await db.resumes.update(mainCV.id!, { parsedData: updated });
        setMainCV({ ...mainCV, parsedData: updated });
        setPendingChanges((prev) => {
            const next = (prev || []).filter((c) => c !== change);
            return next.length ? next : null;
        });
    };

    const handleRejectChange = (change: ProposedChange) => {
        setPendingChanges((prev) => {
            const next = (prev || []).filter((c) => c !== change);
            return next.length ? next : null;
        });
    };

    const handleManualUpdate = async (newData: ResumeData) => {
        if (!mainCV?.id) return;
        setMainCV((prev) => prev ? { ...prev, parsedData: newData } : null);
        await db.resumes.update(mainCV.id, { parsedData: newData });
    };

    // Switch which CV is active in Chat mode
    const handleChatCVChange = (id: number) => {
        const cv = resumes.find((r) => r.id === id);
        if (!cv) return;
        setChatResumeId(id);
        setMainCV(cv);
        setPendingChanges(null);
        setMessages([{
            role: 'model',
            content: `Switched to **${cv.fileName}**. How would you like to update it?`,
            timestamp: Date.now(),
        }]);
    };

    const handleGitHubImportComplete = async () => {
        const cv = await db.getMainCV();
        if (cv) {
            setMainCV(cv);
            setMessages((prev) => [...prev, {
                role: 'model',
                content: 'GitHub projects imported! Check the Projects section.',
                timestamp: Date.now(),
            }]);
        }
    };

    // ── Tailor Handlers ─────────────────────────────────────────────────────────
    const handleAddJob = () => {
        jobActions.addJob({ company: '', title: '', description: '', customPrompt: '' });
    };

    const handleRemoveJob = (id: string) => jobActions.deleteJob(id);

    const updateJob = (id: string, field: keyof Job, value: string) => {
        const job = jobs.find((j) => j.id === id);
        if (job) jobActions.updateJob({ ...job, [field]: value });
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify({ jobs, globalPrompt }, null, 2)], { type: 'application/json' });
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(blob), download: 'jobs-backup.json',
        });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    const handleImport = () => {
        const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' });
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const { jobs: importedJobs, globalPrompt: gp } = JSON.parse(ev.target?.result as string);
                    jobActions.importJobs(importedJobs.map((j: Partial<Job>) => ({
                        company: j.company || '', title: j.title || '',
                        description: j.description || '', customPrompt: j.customPrompt || '',
                    })));
                    jobActions.setGlobalPrompt(gp);
                } catch { alert('Failed to import jobs.'); }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleStartTailoring = async () => {
        const sourceResume = resumes.find((r) => r.id === selectedResumeId);
        if (!sourceResume) { alert('Please select a source resume.'); return; }
        const jobsToProcess = jobs.filter((j) => selectedJobs.has(j.id));
        if (!jobsToProcess.length) { alert('Select at least one job.'); return; }
        const config = getStoredAIConfig();
        if (!config.apiKey) { openApiKeyModal(); return; }

        setIsProcessing(true);
        setProgress(0);
        setProcessingStatus({});

        let sourceData = sourceResume.parsedData;
        if (!sourceData) {
            try {
                sourceData = await parseResumeToJSON(sourceResume.rawText, config);
                if (sourceResume.id) await db.resumes.update(sourceResume.id, { parsedData: sourceData });
            } catch {
                alert('Failed to parse source resume.'); setIsProcessing(false); return;
            }
        }

        for (let i = 0; i < jobsToProcess.length; i++) {
            const job = jobsToProcess[i];
            setProcessingStatus((prev) => ({ ...prev, [job.id]: { status: 'processing' } }));
            try {
                const finalPrompt = `${ROOT_PROMPT}\n\nYou are an expert Resume Strategist.\n${globalPrompt}${job.customPrompt ? `\n\n--- Job-Specific ---\n${job.customPrompt}` : ''}\n\nSOURCE RESUME:\n${JSON.stringify(sourceData, null, 2)}\n\nTARGET JD:\n${job.description}\n\nReturn valid JSON only, no markdown.`;
                const tailored = await tailorResumeV2(config, finalPrompt);
                const newId = await db.resumes.add({
                    createdAt: Date.now(),
                    fileName: `[${job.company}] ${job.title} - ${sourceResume.fileName}`,
                    rawText: sourceResume.rawText,
                    parsedData: tailored,
                    formatted: true,
                    isMain: false,
                });
                setProcessingStatus((prev) => ({ ...prev, [job.id]: { status: 'completed', resultId: newId } }));
            } catch {
                setProcessingStatus((prev) => ({ ...prev, [job.id]: { status: 'error', error: 'Failed.' } }));
            }
            setProgress(Math.round(((i + 1) / jobsToProcess.length) * 100));
        }
        setIsProcessing(false);
    };

    // ── Derived ─────────────────────────────────────────────────────────────────
    const previewData = mainCV?.parsedData
        ?? resumes.find((r) => r.id === selectedResumeId)?.parsedData;

    const selectedResumeName = resumes.find((r) => r.id === selectedResumeId)?.fileName;

    if (isLoading) return (
        <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin" />
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Hidden Print Container — only visible when printing */}
            <div className="hidden print:block" style={{ width: '210mm', margin: '0', padding: '0' }}>
                {previewData && (
                    <ResumePreview
                        data={previewData}
                        template={template}
                        onUpdate={handleManualUpdate}
                    />
                )}
            </div>

            {/* Main UI — hidden when printing */}
            <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background print:hidden">
                <SEO title="CV Studio — HR With AI" description="Unified CV editing, tailoring, and AI chat." />

                {/* ══ LEFT: Collapsible Job Panel ══════════════════════════════════════ */}
                <div
                    className={`flex flex-col border-r border-border bg-card shrink-0 transition-all duration-300 ease-in-out ${isJobPanelOpen ? 'w-72' : 'w-12'
                        }`}
                >
                    {/* Panel header */}
                    <div className="h-12 flex items-center justify-between px-2 border-b border-border shrink-0 gap-1">
                        {isJobPanelOpen && (
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Briefcase className="w-4 h-4 text-primary shrink-0" />
                                <span className="font-semibold text-sm truncate">Job Targets</span>
                                {jobs.length > 0 && (
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                                        {jobs.length}
                                    </Badge>
                                )}
                            </div>
                        )}
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => setIsJobPanelOpen(!isJobPanelOpen)}
                                >
                                    {isJobPanelOpen
                                        ? <PanelLeftClose className="w-4 h-4" />
                                        : <PanelLeftOpen className="w-4 h-4" />
                                    }
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                {isJobPanelOpen ? 'Collapse Job Panel' : 'Expand Job Panel'}
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* ── Open State ── */}
                    {isJobPanelOpen && (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            {/* Source CV selector */}
                            <div className="px-3 py-2 border-b border-border space-y-1.5">
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Source CV
                                </Label>
                                <select
                                    className="w-full p-1.5 text-xs border rounded-md bg-background"
                                    value={selectedResumeId}
                                    onChange={(e) => setSelectedResumeId(Number(e.target.value))}
                                >
                                    {resumes.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.isMain ? '★ ' : ''}{r.fileName}
                                        </option>
                                    ))}
                                </select>
                                {selectedResumeName && (
                                    <p className="text-[10px] text-muted-foreground truncate">
                                        {resumes.find((r) => r.id === selectedResumeId)?.parsedData
                                            ? '✅ Parsed' : '⚠ Not parsed yet'}
                                    </p>
                                )}
                            </div>

                            {/* Toolbar */}
                            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border flex-wrap">
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={handleAddJob}>
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Add Job</TooltipContent>
                                </Tooltip>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsPromptModalOpen(true)}>
                                            <Settings className="w-3 h-3" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit Global Prompt</TooltipContent>
                                </Tooltip>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleImport}>
                                            <Upload className="w-3 h-3" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Import Jobs</TooltipContent>
                                </Tooltip>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExport} disabled={jobs.length === 0}>
                                            <Download className="w-3 h-3" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Export Jobs</TooltipContent>
                                </Tooltip>
                            </div>

                            {/* Job list */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {jobs.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-xs">No jobs yet.</p>
                                        <p className="text-xs">Click <strong>+</strong> to add one.</p>
                                    </div>
                                ) : (
                                    jobs.map((job) => (
                                        <JobCard
                                            key={job.id}
                                            job={job}
                                            isSelected={selectedJobs.has(job.id)}
                                            status={processingStatus[job.id] || { status: 'idle' }}
                                            isProcessing={isProcessing}
                                            onSelect={(checked) => {
                                                const s = new Set(selectedJobs);
                                                checked ? s.add(job.id) : s.delete(job.id);
                                                setSelectedJobs(s);
                                            }}
                                            onRemove={() => handleRemoveJob(job.id)}
                                            onChange={(field, value) => updateJob(job.id, field, value)}
                                            onViewResult={(id) => navigate(`/resumes/${id}/edit`)}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Run button */}
                            <div className="p-3 border-t border-border space-y-2">
                                {isProcessing && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Tailoring...</span><span>{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-1.5" />
                                    </div>
                                )}
                                <Button
                                    className="w-full h-9 text-sm"
                                    onClick={handleStartTailoring}
                                    disabled={isProcessing || !selectedResumeId || selectedJobs.size === 0}
                                >
                                    {isProcessing
                                        ? <><Wand2 className="mr-2 h-4 w-4 animate-spin" />Tailoring...</>
                                        : <><Play className="mr-2 h-4 w-4 fill-current" />Run Tailor ({selectedJobs.size})</>
                                    }
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── Collapsed State: icons only ── */}
                    {!isJobPanelOpen && (
                        <div className="flex flex-col items-center pt-3 gap-2 px-1">
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAddJob}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Add Job</TooltipContent>
                            </Tooltip>

                            {/* Mini status dots for each job */}
                            <div className="flex flex-col gap-1.5 items-center mt-1">
                                {jobs.map((job) => {
                                    const s = processingStatus[job.id]?.status || 'idle';
                                    return (
                                        <Tooltip key={job.id} delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <div className={`w-2.5 h-2.5 rounded-full border ${s === 'completed' ? 'bg-green-500 border-green-500' :
                                                    s === 'processing' ? 'bg-primary border-primary animate-pulse' :
                                                        s === 'error' ? 'bg-destructive border-destructive' :
                                                            'bg-transparent border-muted-foreground'
                                                    } ${selectedJobs.has(job.id) ? 'ring-1 ring-offset-1 ring-primary' : ''}`} />
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                {job.title || 'Untitled'}{job.company ? ` @ ${job.company}` : ''} — {s}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>

                            {selectedJobs.size > 0 && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon" className="h-8 w-8 mt-2"
                                            onClick={handleStartTailoring}
                                            disabled={isProcessing || !selectedResumeId}
                                        >
                                            {isProcessing
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Play className="w-4 h-4 fill-current" />
                                            }
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Run Tailoring ({selectedJobs.size} jobs)</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    )}
                </div>

                {/* ══ CENTER: Chat Assistant ══════════════════════════════════════════ */}
                <div className="flex flex-col border-r border-border bg-background overflow-hidden"
                    style={{ width: '38%', minWidth: '280px' }}
                >
                    {/* Header */}
                    <div className="h-12 px-4 border-b border-border flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-sm">Chat Assistant</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {pendingChanges && (
                                <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full animate-pulse shrink-0">
                                    {pendingChanges.length} pending
                                </span>
                            )}
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setIsGitHubModalOpen(true)}>
                                        <Github size={12} /> Import
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Import GitHub Projects</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Optimized Context Selectors */}
                    <div className="border-b border-border bg-muted/10 p-2 space-y-2 shrink-0">
                        {/* Primary Selection: Edit CV */}
                        <div className="relative flex items-center group">
                            <div className="absolute left-2.5 text-primary opacity-60 group-focus-within:opacity-100 transition-opacity">
                                <FileEdit size={12} />
                            </div>
                            <select
                                className="w-full pl-7 pr-8 py-1 text-[11px] font-medium border border-border bg-background rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer transition-all hover:border-primary/30"
                                value={chatResumeId ?? ''}
                                onChange={(e) => handleChatCVChange(Number(e.target.value))}
                                title="Select CV to Edit"
                            >
                                {resumes.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.isMain ? '★ ' : ''}{r.fileName}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={10} className="absolute right-2.5 text-muted-foreground pointer-events-none opacity-50" />
                        </div>

                        {/* Secondary Contexts: Reference & Goal */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative flex items-center group">
                                <div className="absolute left-2 text-amber-500 opacity-60 group-focus-within:opacity-100 transition-opacity">
                                    <FileSearch size={11} />
                                </div>
                                <select
                                    className="w-full pl-6 pr-6 py-1 text-[10px] border border-border/60 bg-background/50 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 appearance-none cursor-pointer transition-all hover:bg-background"
                                    value={contextResumeId ?? ''}
                                    onChange={(e) => setContextResumeId(e.target.value ? Number(e.target.value) : undefined)}
                                    title="Reference CV Context"
                                >
                                    <option value="">Auto Context (Main)</option>
                                    {resumes.filter(r => r.id !== chatResumeId).map((r) => (
                                        <option key={r.id} value={r.id}>
                                            Ref: {r.fileName}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={9} className="absolute right-2 text-muted-foreground pointer-events-none opacity-40" />
                            </div>

                            <div className="relative flex items-center group">
                                <div className="absolute left-2 text-emerald-500 opacity-60 group-focus-within:opacity-100 transition-opacity">
                                    <Target size={11} />
                                </div>
                                <select
                                    className="w-full pl-6 pr-6 py-1 text-[10px] border border-border/60 bg-background/50 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400 appearance-none cursor-pointer transition-all hover:bg-background"
                                    value={contextJobId ?? ''}
                                    onChange={(e) => setContextJobId(e.target.value || undefined)}
                                    title="Target Job Context"
                                >
                                    <option value="">No Target Job</option>
                                    {jobs.map((j) => (
                                        <option key={j.id} value={j.id}>
                                            {j.title || j.company || 'Job'}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={9} className="absolute right-2 text-muted-foreground pointer-events-none opacity-40" />
                            </div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <ChatArea messages={messages} isProcessing={isTyping} />

                    {/* Pending changes inline */}
                    {pendingChanges && pendingChanges.length > 0 && (
                        <div className="border-t border-border bg-amber-500/5 p-3 space-y-2 max-h-48 overflow-y-auto shrink-0">
                            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                                <AlertCircle size={13} />
                                <span>Proposed Changes — review before accepting</span>
                            </div>
                            {pendingChanges.map((change, idx) => (
                                <ChangeReviewCard
                                    key={idx}
                                    change={change}
                                    onAccept={() => handleAcceptChange(change)}
                                    onReject={() => handleRejectChange(change)}
                                />
                            ))}
                        </div>
                    )}

                    <SimpleInputArea
                        onSendMessage={handleSendMessage}
                        disabled={isTyping || !mainCV}
                        placeholder={mainCV
                            ? "Ask AI to update your CV... (e.g. 'Add TypeScript to skills')"
                            : 'No CV selected'}
                    />
                </div>

                {/* ══ RIGHT: CV Preview ═══════════════════════════════════════════════ */}
                <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
                    {/* Toolbar */}
                    <div className="h-12 px-4 border-b border-border bg-background flex items-center justify-between shrink-0 gap-2">
                        <div className="flex bg-muted p-1 rounded-lg">
                            <Button
                                variant="ghost" size="sm"
                                className={`h-7 px-3 gap-1 text-xs ${previewViewMode === 'preview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setPreviewViewMode('preview')}
                            >
                                <Eye size={12} /> Preview
                            </Button>
                            <Button
                                variant="ghost" size="sm"
                                className={`h-7 px-3 gap-1 text-xs ${previewViewMode === 'form' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setPreviewViewMode('form')}
                            >
                                <Edit3 size={12} /> Form
                            </Button>
                            <Button
                                variant="ghost" size="sm"
                                className={`h-7 px-3 gap-1 text-xs ${previewViewMode === 'split' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setPreviewViewMode('split')}
                            >
                                <Columns size={12} /> Split
                            </Button>
                        </div>

                        {/* Template + actions */}
                        <div className="flex items-center gap-1">
                            <DropdownMenu>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <LayoutTemplate className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Switch Template</TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent align="end">
                                    {(['modern', 'classic', 'creative', 'minimalist', 'academic'] as const).map(t => (
                                        <DropdownMenuItem key={t} onClick={() => setTemplate(t)}>
                                            {template === t ? '✓ ' : ''}{t.charAt(0).toUpperCase() + t.slice(1)}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 relative overflow-hidden">
                                                <Palette className="w-4 h-4 z-10" />
                                                <div className="absolute inset-0 opacity-20" style={{ backgroundColor: previewData?.meta?.themeColor || '#2563eb' }} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Theme Color</TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent align="end" className="w-48 p-2">
                                    <div className="grid grid-cols-4 gap-2">
                                        {['#2563eb', '#0f172a', '#059669', '#16a34a', '#d97706', '#ea580c', '#dc2626', '#e11d48', '#c026d3', '#9333ea', '#7c3aed', '#4f46e5', '#0891b2', '#0d9488'].map(color => (
                                            <button
                                                key={color}
                                                className="w-8 h-8 rounded-full border border-border shadow-sm hover:scale-110 transition-transform"
                                                style={{ backgroundColor: color }}
                                                onClick={() => {
                                                    if (!mainCV?.parsedData || !mainCV.id) return;
                                                    const updated = { ...mainCV.parsedData, meta: { ...mainCV.parsedData.meta, themeColor: color } };
                                                    handleManualUpdate(updated);
                                                }}
                                            />
                                        ))}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <TypeIcon className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Font</TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent align="end">
                                    {(['sans', 'serif', 'mono'] as const).map(font => (
                                        <DropdownMenuItem key={font} onClick={() => {
                                            if (!mainCV?.parsedData || !mainCV.id) return;
                                            const updated = { ...mainCV.parsedData, meta: { ...mainCV.parsedData.meta, fontFamily: font } };
                                            handleManualUpdate(updated);
                                        }}>
                                            {font === 'sans' ? 'Sans-serif' : font === 'serif' ? 'Serif' : 'Monospace'}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowReorderDialog(true)} disabled={!previewData}>
                                        <List className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Arrange Sections</TooltipContent>
                            </Tooltip>

                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => window.print()} disabled={!previewData}>
                                        <Printer className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Export PDF</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex">
                        {/* SPLIT: raw text vs preview */}
                        {previewViewMode === 'split' ? (
                            <div className="flex w-full h-full overflow-hidden">
                                <div className="w-1/2 border-r border-border flex flex-col bg-muted/10">
                                    <div className="p-3 border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground flex justify-between">
                                        <span>CV Data (JSON)</span>
                                        <span>Read-only</span>
                                    </div>
                                    <div className="flex-1 overflow-auto p-3">
                                        <pre className="whitespace-pre-wrap font-mono text-xs text-foreground/70 leading-relaxed">
                                            {previewData ? JSON.stringify(previewData, null, 2) : 'No data'}
                                        </pre>
                                    </div>
                                </div>
                                <div className="w-1/2 flex flex-col bg-muted/30">
                                    <div className="p-3 border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground text-center">
                                        CV Preview
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 flex justify-center">
                                        {previewData ? (
                                            <div className="scale-[0.62] origin-top w-full max-w-[210mm]">
                                                <div className="bg-white shadow-xl">
                                                    <ResumePreview
                                                        data={previewData}
                                                        template={template}
                                                        onUpdate={handleManualUpdate}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground pt-12">No CV selected</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : previewViewMode === 'preview' ? (
                            /* PREVIEW */
                            <div className="flex w-full h-full overflow-hidden">
                                {/* Main preview */}
                                <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-muted/30">
                                    {previewData ? (
                                        <div className="scale-[0.78] origin-top w-full max-w-[210mm]">
                                            <div className="bg-white shadow-2xl min-h-[297mm]">
                                                <ResumePreview
                                                    data={previewData}
                                                    template={template}
                                                    onUpdate={handleManualUpdate}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                                            <Eye className="w-12 h-12 opacity-20" />
                                            <p className="text-sm">No CV to preview</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* FORM */
                            <div className="flex w-full h-full overflow-hidden">
                                {/* Section sidebar */}
                                <div className="w-44 shrink-0 border-r border-border bg-card overflow-y-auto">
                                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                                        <TabsList className="flex flex-col h-auto bg-transparent p-2 gap-1 w-full justify-start">
                                            <TabsTrigger value="basics" className="w-full justify-start px-3 py-2 text-xs">Basics</TabsTrigger>
                                            <TabsTrigger value="work" className="w-full justify-start px-3 py-2 text-xs">Work</TabsTrigger>
                                            <TabsTrigger value="education" className="w-full justify-start px-3 py-2 text-xs">Education</TabsTrigger>
                                            <TabsTrigger value="skills" className="w-full justify-start px-3 py-2 text-xs">Skills</TabsTrigger>
                                            <TabsTrigger value="projects" className="w-full justify-start px-3 py-2 text-xs">Projects</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>

                                {/* Form editor */}
                                <div className="flex-1 overflow-y-auto p-6 bg-background">
                                    {mainCV?.parsedData ? (
                                        <div className="max-w-2xl mx-auto">
                                            {activeTab === 'basics' && <BasicsForm data={mainCV.parsedData.basics} onChange={(v) => handleManualUpdate({ ...mainCV.parsedData!, basics: v })} />}
                                            {activeTab === 'work' && <WorkForm data={mainCV.parsedData.work} onChange={(v) => handleManualUpdate({ ...mainCV.parsedData!, work: v })} />}
                                            {activeTab === 'education' && <EducationForm data={mainCV.parsedData.education} onChange={(v) => handleManualUpdate({ ...mainCV.parsedData!, education: v })} />}
                                            {activeTab === 'skills' && <SkillsForm data={mainCV.parsedData.skills} onChange={(v) => handleManualUpdate({ ...mainCV.parsedData!, skills: v })} />}
                                            {activeTab === 'projects' && <ProjectsForm data={mainCV.parsedData.projects} onChange={(v) => handleManualUpdate({ ...mainCV.parsedData!, projects: v })} />}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            <p className="text-sm">No CV selected</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Modals ── */}
                <SectionReorderDialog
                    isOpen={showReorderDialog}
                    onClose={() => setShowReorderDialog(false)}
                    data={previewData ? { ...previewData, meta: { ...previewData.meta, template } } : { basics: { name: '', email: '', summary: '' }, work: [], education: [], skills: [], projects: [] }}
                    onSave={(newOrder) => {
                        if (!mainCV?.parsedData || !mainCV.id) return;
                        handleManualUpdate({ ...mainCV.parsedData, meta: { ...mainCV.parsedData.meta, sectionOrder: newOrder, template } });
                    }}
                />

                {/* ── Modals ── */}
                <EditGlobalPromptModal
                    isOpen={isPromptModalOpen}
                    onClose={() => setIsPromptModalOpen(false)}
                    currentPrompt={globalPrompt}
                    onSave={jobActions.setGlobalPrompt}
                />
                <GitHubImportModal
                    isOpen={isGitHubModalOpen}
                    onClose={() => setIsGitHubModalOpen(false)}
                    onImportComplete={handleGitHubImportComplete}
                />
            </div>
        </>
    );
};

export default CVStudioPage;
