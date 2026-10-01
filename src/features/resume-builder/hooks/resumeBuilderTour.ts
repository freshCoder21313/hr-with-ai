import type { Step } from 'react-joyride';

/** Joyride tour for the resume builder. Kept out of `useResumeBuilder` so the
 *  hook stays focused on state and effects. */
export const TOUR_STEPS: Step[] = [
  {
    target: 'body',
    content: "Welcome to the AI Resume Builder! Let's take a quick tour.",
    placement: 'center',
  },
  {
    target: '.tour-magic-format',
    content: 'Uploaded a raw text resume? Click here to let AI automatically format it for you!',
  },
  {
    target: '.tour-layout-switch',
    content:
      'Switch between Modern, Classic, Creative, Minimalist, or Academic templates instantly.',
  },
  {
    target: '.tour-translate',
    content: 'Translate your entire resume between English and Vietnamese with one click.',
  },
  {
    target: '.tour-preview-toggle',
    content: 'Toggle between Editor, Full Preview, or Split View side-by-side.',
  },
  {
    target: '.tour-fab',
    content: 'Use this button to quickly add new Work Experience, Education, or Skills.',
  },
];
