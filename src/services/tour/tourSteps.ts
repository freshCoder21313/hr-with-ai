import type { DriveStep } from 'driver.js';

export interface TourStepWithMeta extends DriveStep {
  mobileTab?: 'jobs' | 'chat' | 'preview';
  settingsTab?: 'general' | 'ai-profiles';
  drawerTab?: 'overview' | 'confirmations' | 'facts' | 'evidence' | 'questions';
}

export const TOUR_BUILDER_STEPS: TourStepWithMeta[] = [
  {
    element: 'body',
    popover: {
      title: 'Resume Builder Tour',
      description: "Welcome to the AI Resume Builder! Let's take a quick tour.",
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '.tour-magic-format',
    popover: {
      title: 'Magic Format',
      description: 'Uploaded a raw text resume? Click here to let AI automatically format it for you!',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-layout-switch',
    popover: {
      title: 'Templates & Layouts',
      description: 'Switch between Modern, Classic, Creative, Minimalist, or Academic templates instantly.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '.tour-translate',
    popover: {
      title: 'Multilingual Translation',
      description: 'Translate your entire resume between English and Vietnamese with one click.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '.tour-preview-toggle',
    popover: {
      title: 'Preview Modes',
      description: 'Toggle between Editor, Full Preview, or Split View side-by-side.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '.tour-fab',
    popover: {
      title: 'Quick Add Items',
      description: 'Use this button to quickly add new Work Experience, Education, or Skills.',
      side: 'left',
      align: 'end',
    },
  },
];

export const TOUR_LANDING_STEPS: TourStepWithMeta[] = [
  {
    element: '.tour-landing-welcome',
    popover: {
      title: 'Welcome to HR With AI',
      description:
        'Your AI-powered career co-pilot for resume building, mock interviews, and skill coaching.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-landing-stats',
    popover: {
      title: 'Practice Progress & Stats',
      description:
        'Track your interview preparation time, completed mock sessions, and average performance scores here.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '.tour-landing-practice',
    popover: {
      title: 'Mock Interview Studio',
      description:
        'Start customized interview simulations with strict HR or technical lead personas, voice support, and real-time feedback.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '.tour-landing-studio',
    popover: {
      title: 'CV Studio Hub',
      description:
        'Upload and tailor resumes against specific Job Descriptions (JDs) with AI chat and instant live preview.',
      side: 'top',
      align: 'center',
    },
  },
];

export const TOUR_SETUP_STEPS: TourStepWithMeta[] = [
  {
    element: '.tour-setup-role',
    popover: {
      title: 'Target Role & Company',
      description:
        'Enter your desired job title and company, or pick from popular industry presets (Google, Meta, Startups).',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-setup-resume',
    popover: {
      title: 'Select Comparison Resume',
      description:
        'Select which resume the AI interviewer should examine to generate targeted technical and behavioral questions.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-setup-config',
    popover: {
      title: 'Interviewer Persona & Focus',
      description:
        'Configure interviewer style (Strict HR, Friendly Coach, Tech Lead), question depth (Behavioral, Technical), and interaction mode (Chat or Voice).',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '.tour-setup-start',
    popover: {
      title: 'Begin Interview Room',
      description:
        'Ready to practice? Click Start Interview to enter the live interactive session.',
      side: 'top',
      align: 'center',
    },
  },
];

export const TOUR_STUDIO_STEPS: TourStepWithMeta[] = [
  {
    element: '.tour-studio-intro',
    mobileTab: 'chat',
    popover: {
      title: 'CV Studio Workspace',
      description:
        'Welcome to CV Studio! This 3-column workspace unifies Job Management, AI-Assisted Chat, and Real-Time Resume Preview.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '.tour-studio-job-add',
    mobileTab: 'jobs',
    popover: {
      title: 'Job Management & Smart JD Import',
      description:
        'Add target Job Descriptions manually or paste a job posting link/text to automatically extract key requirements.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '.tour-studio-tailoring',
    mobileTab: 'jobs',
    popover: {
      title: 'AI Auto-Tailor (Magic Wand)',
      description:
        'Select jobs and click Auto-Tailor to let AI generate job-tailored resume variations highlighting your relevant skills.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '.tour-studio-chat-context',
    mobileTab: 'chat',
    popover: {
      title: 'Target Job & Context Selectors',
      description:
        'Pin a target job and active resume to provide clear context for your AI chat refinements.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-studio-chat-input',
    mobileTab: 'chat',
    popover: {
      title: 'AI Chat & Action Shortcuts',
      description:
        'Chat with AI to refine bullet points using STAR format, import GitHub projects, and suggest ATS keywords.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '.tour-studio-career-knowledge',
    mobileTab: 'chat',
    popover: {
      title: 'Career Knowledge Drawer',
      description:
        'Manage verified career facts, achievements, and credentials to ensure AI never invents false experience.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '.tour-studio-preview-mode',
    mobileTab: 'preview',
    popover: {
      title: 'Preview, Edit & Split Modes',
      description:
        'Switch between Page Preview (print view), direct Form Editing, and Split View to inspect changes side-by-side.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '.tour-studio-export-pdf',
    mobileTab: 'preview',
    popover: {
      title: 'Themes & PDF Export',
      description:
        'Customize color accents and export your finished resume as a crisp, printable PDF ready for submission.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const TOUR_SKILL_STEPS: TourStepWithMeta[] = [
  {
    element: '.tour-skill-upload',
    popover: {
      title: 'Upload or Select Resume',
      description: 'Select a resume to extract relevant technical and domain skills for testing.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-skill-select',
    popover: {
      title: 'Choose Skills to Assess',
      description: 'Pick target competencies suggested by AI or search for specific skills.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-skill-start',
    popover: {
      title: 'Start Interactive Quiz',
      description: 'Take timed multiple-choice and scenario questions to measure proficiency.',
      side: 'top',
      align: 'center',
    },
  },
];

export const TOUR_MODAL_SMART_JD_STEPS: TourStepWithMeta[] = [
  {
    element: '.tour-smart-jd-input',
    popover: {
      title: 'Paste Raw Job Description',
      description: 'Paste any job description from LinkedIn, TopCV, Indeed, or email to start.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-smart-jd-parse-btn',
    popover: {
      title: 'Parse & Extract',
      description: 'Let AI parse role title, company, requirements, responsibilities, and seniority.',
      side: 'top',
      align: 'end',
    },
  },
  {
    element: '.tour-smart-jd-fields',
    popover: {
      title: 'Review & Edit Fields',
      description: 'Review extracted attributes, edit details, or customize the suggested AI tailoring prompt.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '.tour-smart-jd-save',
    popover: {
      title: 'Save to Target Jobs',
      description: 'Add the parsed role to your Target Jobs list for one-click resume tailoring.',
      side: 'top',
      align: 'end',
    },
  },
];

export const TOUR_DRAWER_CAREER_KNOWLEDGE_STEPS: TourStepWithMeta[] = [
  {
    element: '.tour-career-facts-list',
    popover: {
      title: 'Canonical Career Facts',
      description: 'Your verified career timeline, achievements, skills, and credentials that ground all AI responses.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '.tour-career-add-fact',
    popover: {
      title: 'Add & Import Facts',
      description: 'Import facts from existing resumes or scan GitHub repositories to expand your career knowledge base.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-career-evidence',
    popover: {
      title: 'Provenance & Evidence Records',
      description: 'View immutable evidence logs and source references proving every achievement.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '.tour-career-category-filter',
    drawerTab: 'facts',
    popover: {
      title: 'Filter by Category',
      description: 'Quickly filter claims by Experience, Skills, Projects, Education, Achievements, or Certifications.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const TOUR_MODAL_SETTINGS_STEPS: TourStepWithMeta[] = [
  {
    element: '.tour-settings-tabs',
    settingsTab: 'general',
    popover: {
      title: 'Settings Navigation',
      description: 'Switch between general interview preferences and AI provider configuration.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '.tour-settings-reset-tours',
    settingsTab: 'general',
    popover: {
      title: 'Reset Guided Tours',
      description: 'Reset all interactive feature walkthroughs so they display again when visiting pages.',
      side: 'top',
      align: 'end',
    },
  },
  {
    element: '.tour-settings-provider-select',
    settingsTab: 'ai-profiles',
    popover: {
      title: 'AI Provider Selection',
      description: 'Select your preferred AI provider (Google Gemini, OpenAI, OpenRouter, or Anthropic).',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-settings-api-key',
    settingsTab: 'ai-profiles',
    popover: {
      title: 'API Key Configuration',
      description: 'Configure and test private API keys stored strictly on your local device.',
      side: 'bottom',
      align: 'start',
    },
  },
];

export const TOUR_INTERVIEW_STEPS: TourStepWithMeta[] = [
  {
    element: '.tour-interview-chat',
    popover: {
      title: 'Interview Dialogue',
      description:
        'Follow questions and feedback from your AI interviewer here in real time.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-interview-hints',
    popover: {
      title: 'Real-time AI Hints',
      description:
        'Need inspiration? Request tailored hints and answer structure tips on demand.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '.tour-interview-tools',
    popover: {
      title: 'Coding & Whiteboard Tools',
      description:
        'Launch interactive code editor or diagramming whiteboard for technical scenarios.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '.tour-interview-input',
    popover: {
      title: 'Answer Input & Voice',
      description:
        'Type your response or toggle microphone speech-to-text to practice verbal answers.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '.tour-interview-end',
    popover: {
      title: 'Complete Session',
      description:
        'End the mock interview at any point to generate your comprehensive performance evaluation.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const TOUR_FEEDBACK_STEPS: TourStepWithMeta[] = [
  {
    element: '.tour-feedback-summary',
    popover: {
      title: 'Performance Overview',
      description:
        'Review your overall score, key strengths, improvement areas, and executive summary.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-feedback-tabs',
    popover: {
      title: 'Detailed Breakdown Tabs',
      description:
        'Explore question-by-question scoring, communication analytics, and full conversation transcript.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '.tour-feedback-coaching',
    popover: {
      title: 'Language & Delivery Coaching',
      description:
        'Receive deep coaching on grammar, vocabulary, filler words, and concise delivery.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '.tour-feedback-print',
    popover: {
      title: 'Export Feedback Report',
      description:
        'Save or print a clean PDF report of your interview evaluation for offline study.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const TOUR_HISTORY_STEPS: TourStepWithMeta[] = [
  {
    element: '.tour-history-tabs',
    popover: {
      title: 'Activity Categories',
      description:
        'Switch between mock interviews, skill assessments, and saved target jobs.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-history-charts-toggle',
    popover: {
      title: 'Growth Analytics & Charts',
      description:
        'Toggle progress charts, radar breakdowns, and personalized learning paths.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.tour-history-search',
    popover: {
      title: 'Filter & Search Sessions',
      description:
        'Quickly find past practice sessions by company name or target job role.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '.tour-history-list',
    popover: {
      title: 'Session Records',
      description:
        'Review scores, re-open feedback reports, or resume unfinished interview rounds.',
      side: 'top',
      align: 'start',
    },
  },
];

export const TOUR_DEFINITIONS: Record<string, TourStepWithMeta[]> = {
  tour_landing: TOUR_LANDING_STEPS,
  tour_setup: TOUR_SETUP_STEPS,
  tour_studio: TOUR_STUDIO_STEPS,
  tour_builder: TOUR_BUILDER_STEPS,
  tour_skill: TOUR_SKILL_STEPS,
  tour_interview: TOUR_INTERVIEW_STEPS,
  tour_feedback: TOUR_FEEDBACK_STEPS,
  tour_history: TOUR_HISTORY_STEPS,
  tour_modal_smart_jd: TOUR_MODAL_SMART_JD_STEPS,
  tour_drawer_career_knowledge: TOUR_DRAWER_CAREER_KNOWLEDGE_STEPS,
  tour_modal_settings: TOUR_MODAL_SETTINGS_STEPS,
};

/**
 * Resolves pathname to corresponding tour identifier.
 */
export const getTourIdForRoute = (pathname: string): string | null => {
  const cleanPath = pathname.replace(/^#/, '');

  if (cleanPath === '' || cleanPath === '/') {
    return 'tour_landing';
  }
  if (cleanPath === '/setup') {
    return 'tour_setup';
  }
  if (cleanPath === '/studio') {
    return 'tour_studio';
  }
  if (/^\/resumes\/\d+\/edit/.test(cleanPath)) {
    return 'tour_builder';
  }
  if (cleanPath === '/skill-assessment') {
    return 'tour_skill';
  }
  if (/^\/interview\/\w+/.test(cleanPath)) {
    return 'tour_interview';
  }
  if (/^\/feedback\/\w+/.test(cleanPath)) {
    return 'tour_feedback';
  }
  if (cleanPath === '/history') {
    return 'tour_history';
  }

  return null;
};
