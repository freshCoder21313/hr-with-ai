import React, { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/db';
import { Resume, Message } from '@/types';
import { ResumeData } from '@/types/resume';
import { ChatArea } from '@/features/interview/components/ChatArea';
import { SimpleInputArea } from './SimpleInputArea';
import { streamCVChatMessage } from '@/services/cvChatService';
import { extractProposedChanges, ProposedChange } from './cvChatUtils';
import ResumePreview from '@/features/resume-builder/ResumePreview';
import {
  Loader2,
  Save,
  Undo2,
  ArrowRight,
  Upload,
  Sparkles,
  AlertCircle,
  Eye,
  Edit3,
  LayoutTemplate,
  Github,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ResumeList from '@/features/dashboard/ResumeList';
import { parseResume } from '@/services/resumeParser';
import { getStoredAIConfig, parseResumeToJSON } from '@/services/geminiService';
import { ChangeReviewCard } from './ChangeReviewCard';
import { ResumeFormView } from './ResumeFormView';
import { Button } from '@/components/ui/button';
import { GitHubImportModal } from '@/features/resume-builder/github-import/GitHubImportModal';
import SEO from '@/components/SEO';

// Allowed keys from the ResumeData schema
const ALLOWED_SECTIONS = [
  'basics',
  'work',
  'education',
  'skills',
  'projects',
  'languages',
  'interests',
  'references',
  'volunteer',
  'awards',
  'publications',
  'meta',
];

const CVChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [mainCV, setMainCV] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ProposedChange[] | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'preview'>('form');
  const [template, setTemplate] = useState<'modern' | 'classic'>('modern');

  // GitHub Import State
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  // Selection State
  const [allResumes, setAllResumes] = useState<Resume[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Initialize: Load Main CV
  useEffect(() => {
    const loadData = async () => {
      try {
        const cv = await db.getMainCV();
        if (cv) {
          setMainCV(cv);
          setMessages([
            {
              role: 'model',
              content: `Hello! I see you're working on **${cv.fileName}**. How can I help you update it today?`,
              timestamp: Date.now(),
            },
          ]);
        } else {
          // No Main CV found, fetch all resumes for selection
          const resumes = await db.resumes.toArray();
          setAllResumes(resumes.sort((a, b) => b.createdAt - a.createdAt));
        }
      } catch (error) {
        console.error('Failed to load data', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSelectAsMain = async (resume: Resume) => {
    if (!resume.id) return;
    try {
      await db.setMainCV(resume.id);
      setMainCV(resume);
      setMessages([
        {
          role: 'model',
          content: `Great choice! I've set **${resume.fileName}** as your Main CV. How would you like to update it?`,
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      console.error('Failed to set Main CV', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const text = await parseResume(file);

      // We must also parse it to JSON for the chat to work
      const config = getStoredAIConfig();
      // If no API key, we might need to prompt user, but for now assuming key exists or will fail gracefully
      if (!config.apiKey) {
        alert('Please set your API Key in settings first to process this resume.');
        return;
      }

      const parsedData = await parseResumeToJSON(text, config);

      const newResume: Resume = {
        createdAt: Date.now(),
        fileName: file.name,
        rawText: text,
        parsedData: parsedData,
        formatted: true,
      };

      const id = await db.resumes.add(newResume);
      // Immediately select as main
      await db.setMainCV(id);

      const savedResume = { ...newResume, id, isMain: true };
      setMainCV(savedResume);
      setMessages([
        {
          role: 'model',
          content: `I've imported and set **${file.name}** as your Main CV. Let's get to work!`,
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      alert('Failed to parse resume');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSendMessage = async (text: string, image?: string) => {
    if (!mainCV || !mainCV.parsedData) return;

    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
      image,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    let fullResponse = '';
    const aiMsgId = Date.now();

    // Add placeholder AI message
    setMessages((prev) => [...prev, { role: 'model', content: '', timestamp: aiMsgId }]);

    try {
      const config = getStoredAIConfig();

      const stream = streamCVChatMessage(messages.concat(userMsg), text, mainCV.parsedData, config);

      let cleanResponse = '';

      for await (const chunk of stream) {
        fullResponse += chunk;

        // Real-time cleaning for better UX (optional, but good for removing large JSON blocks from view)
        // We accept that while streaming, the user might see raw JSON for a split second before we fully parse it at the end
        // Or we can try to hide the ```json block if we detect it.

        setMessages((prev) =>
          prev.map((m) => (m.timestamp === aiMsgId ? { ...m, content: fullResponse } : m))
        );
      }

      // Final Clean-up & Extraction
      const changes = extractProposedChanges(fullResponse);
      if (changes && changes.length > 0) {
        setPendingChanges((prev) => [...(prev || []), ...changes]);

        // Remove the JSON block from the chat message to keep it clean
        cleanResponse = fullResponse.replace(/```(?:json)?\s*[\s\S]*?\s*```/i, '').trim();
        if (!cleanResponse) cleanResponse = "I've drafted some updates for your review.";

        setMessages((prev) =>
          prev.map((m) => (m.timestamp === aiMsgId ? { ...m, content: cleanResponse } : m))
        );
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: 'Sorry, something went wrong.', timestamp: Date.now() },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAcceptChange = async (change: ProposedChange) => {
    if (!mainCV || !mainCV.parsedData) return;

    // Apply change to local state with Type Safety check
    const currentSectionData = mainCV.parsedData[change.section];

    // Safety Check: Ensure we don't replace an Array with an Object or vice versa due to AI hallucination
    const isArrayExpected = Array.isArray(currentSectionData);
    const isArrayReceived = Array.isArray(change.newData);

    if (currentSectionData !== undefined && isArrayExpected !== isArrayReceived) {
      alert(
        `Error: AI returned invalid data type for ${change.section}. Expected ${isArrayExpected ? 'List' : 'Object'}, got ${isArrayReceived ? 'List' : 'Object'}.`
      );
      return;
    }

    if (currentSectionData === undefined && !ALLOWED_SECTIONS.includes(change.section)) {
      alert(
        `Error: AI returned invalid section: ${change.section}. Allowed: ${ALLOWED_SECTIONS.join(', ')}`
      );
      return;
    }

    const updatedData = { ...mainCV.parsedData };
    updatedData[change.section] = change.newData;

    // Update DB
    await db.resumes.update(mainCV.id!, {
      parsedData: updatedData,
      rawText: JSON.stringify(updatedData, null, 2), // Keep rawText in sync roughly
    });

    // Update UI
    setMainCV({ ...mainCV, parsedData: updatedData });

    // Remove from pending
    setPendingChanges((prev) => {
      if (!prev) return null;
      const next = prev.filter((c) => c !== change);
      return next.length > 0 ? next : null;
    });
  };

  const handleManualUpdate = async (newData: ResumeData) => {
    if (!mainCV || !mainCV.id) return;

    // Update UI immediately
    setMainCV((prev) => (prev ? { ...prev, parsedData: newData } : null));

    // Persist to DB
    try {
      await db.resumes.update(mainCV.id, {
        parsedData: newData,
        rawText: JSON.stringify(newData, null, 2),
      });
    } catch (error) {
      console.error('Failed to save manual changes', error);
    }
  };

  const handleGitHubImportComplete = async () => {
    try {
      const cv = await db.getMainCV();
      if (cv) {
        setMainCV(cv);
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content:
              'I have updated your resume with the projects imported from GitHub. You can review them in the Projects section.',
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to refresh CV after import', error);
    }
  };

  const handleRejectChange = (change: ProposedChange) => {
    setPendingChanges((prev) => {
      if (!prev) return null;
      const next = prev.filter((c) => c !== change);
      return next.length > 0 ? next : null;
    });
  };

  if (isLoading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (!mainCV) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <SEO
          title="AI Resume Chat - HR With AI"
          description="Interactive AI assistant to help you improve and tailor your resume."
        />
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Setup Your Main CV</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            To start using the AI Chat Assistant, you need to designate a &quot;Main CV&quot;. This
            will be the single source of truth that we update together.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-foreground">
              <Sparkles className="text-primary" />
              Select Existing Resume
            </h3>
            {allResumes.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto pr-2">
                {/* Reusing ResumeList but stripped down behavior */}
                {allResumes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handleSelectAsMain(r)}
                    className="p-3 border border-border rounded mb-2 hover:bg-primary/5 hover:border-primary/30 cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <span className="font-medium truncate text-foreground">{r.fileName}</span>
                    <ArrowRight size={16} className="text-primary" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">No uploaded resumes found.</p>
            )}
          </div>

          <div className="bg-card p-6 rounded-xl shadow-sm border border-border flex flex-col justify-center items-center text-center gap-4 border-dashed">
            <div className="p-4 bg-muted rounded-full">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Upload New Resume</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a PDF to set as your Main CV immediately.
              </p>
            </div>
            <label className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 cursor-pointer transition-colors flex items-center gap-2">
              {isParsing ? <Loader2 className="animate-spin" size={18} /> : null}
              <span>{isParsing ? 'Processing...' : 'Select PDF File'}</span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isParsing}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <SEO
        title={`Edit ${mainCV.fileName} - HR With AI`}
        description="Interactive AI assistant to help you improve and tailor your resume."
      />
      {/* Left: Chat */}
      <div className="w-1/2 md:w-[40%] border-r border-border flex flex-col bg-background z-10 shadow-xl">
        <div className="h-12 px-4 border-b border-border bg-background flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">Chat Assistant</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 ml-2"
                  onClick={() => setIsGitHubModalOpen(true)}
                >
                  <Github size={12} />
                  Import Projects
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import Projects from GitHub</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {pendingChanges && (
            <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full animate-pulse">
              {pendingChanges.length} Pending Updates
            </span>
          )}
        </div>

        <ChatArea messages={messages} />

        <SimpleInputArea
          onSendMessage={handleSendMessage}
          disabled={isTyping}
          placeholder="Type update instructions (e.g. 'Add React to my skills')..."
        />
      </div>

      {/* Right: Preview & Review */}
      <div className="flex-1 flex overflow-hidden flex-col">
        {/* View Toggle Header */}
        <div className="h-12 bg-background border-b border-border flex items-center justify-between px-4 gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {viewMode === 'preview' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTemplate((t) => (t === 'modern' ? 'classic' : 'modern'))}
                    className="text-xs text-muted-foreground gap-1.5 h-8"
                  >
                    <LayoutTemplate size={14} />
                    {template === 'modern' ? '2-Column' : '1-Column'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Switch Layout (1-Col / 2-Col)</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">View:</span>
            <div className="flex bg-muted p-1 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-3 text-xs ${viewMode === 'form' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setViewMode('form')}
              >
                <Edit3 size={12} className="mr-1.5" /> Form
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-3 text-xs ${viewMode === 'preview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setViewMode('preview')}
              >
                <Eye size={12} className="mr-1.5" /> Preview
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Middle: Resume Preview or Form (Scrollable) */}
          <div className="flex-1 bg-muted/30 overflow-y-auto p-4 md:p-8 flex justify-center relative">
            <div className={`w-full ${viewMode === 'preview' ? 'max-w-[210mm]' : 'max-w-3xl'}`}>
              {/* We pass the Main CV data. If we had a 'Draft' mode, we'd pass that instead. */}
              {mainCV.parsedData ? (
                viewMode === 'preview' ? (
                  <div className="bg-white shadow-lg min-h-[297mm] text-slate-900">
                    {/* Note: ResumePreview usually renders a printed page representation, so it should stay white even in dark mode for accuracy */}
                    <ResumePreview data={mainCV.parsedData} template={template} />
                  </div>
                ) : (
                  <ResumeFormView data={mainCV.parsedData} onChange={handleManualUpdate} />
                )
              ) : (
                <div className="p-10 text-center text-muted-foreground">
                  Resume data not parsed.
                </div>
              )}
            </div>
          </div>

          {/* Right: Review Sidebar (Fixed Width, Scrollable) */}
          {pendingChanges && pendingChanges.length > 0 && (
            <div className="w-[350px] border-l border-border bg-muted/10 p-4 overflow-y-auto shadow-inner z-20 flex flex-col gap-4">
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg shadow-sm flex items-start gap-2 animate-in slide-in-from-right-2">
                <AlertCircle
                  className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                  size={18}
                />
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">Review Pending Updates:</span>
                  <p>Changes are not saved until you click Accept.</p>
                </div>
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
        </div>
      </div>
      <GitHubImportModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onImportComplete={handleGitHubImportComplete}
      />
    </div>
  );
};

export default CVChatPage;
