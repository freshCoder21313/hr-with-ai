import type { Step } from 'react-joyride';

/** Persisted once the tour ends, however it ends. */
export const TOUR_COMPLETED_KEY = 'hasSeenResumeBuilderTour';

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

/**
 * "The user is done" statuses. Joyride reports the same outcome under several
 * names depending on how the tour exited, and each of them must persist
 * completion so the tour never comes back.
 */
const TERMINAL_STATUS: Record<string, true> = {
  finished: true,
  skipped: true,
  error: true,
  close: true,
};

export const isTerminalTourStatus = (status: string): boolean => TERMINAL_STATUS[status] === true;

/**
 * Drop steps whose target is not on the page.
 *
 * Joyride leaves a step with a missing target in a lifecycle other than
 * TOOLTIP, which silently disables its Escape handling while the
 * full-viewport overlay keeps `pointer-events: auto` — the editor swallows
 * every click and the tour can only be escaped by reloading. Steps without a
 * live target are removed up front instead, so "Next" always advances one real
 * step and every remaining step points at something actually on screen.
 *
 * Call this when the tour is about to run, after the editor has mounted.
 */
export const buildTourSteps = (steps: Step[] = TOUR_STEPS): Step[] =>
  steps.filter((step, index) => {
    if (index === 0) return true;
    const { target } = step;
    if (!target || typeof target !== 'string') return true;
    try {
      return document.querySelector(target) !== null;
    } catch {
      return false;
    }
  });
