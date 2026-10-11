import type { DriveStep } from 'driver.js';
import { TOUR_BUILDER_STEPS } from '@/services/tour/tourSteps';
import { buildTourSteps as genericBuildTourSteps } from '@/services/tour/tourUtils';

/** Persisted once the tour ends, however it ends. */
export const TOUR_COMPLETED_KEY = 'hasSeenResumeBuilderTour';

/** Driver.js steps for the resume builder. */
export const TOUR_STEPS: DriveStep[] = TOUR_BUILDER_STEPS;

/**
 * Terminal tour status helper.
 */
const TERMINAL_STATUS: Record<string, true> = {
  finished: true,
  skipped: true,
  error: true,
  close: true,
  destroyed: true,
};

export const isTerminalTourStatus = (status: string): boolean => TERMINAL_STATUS[status] === true;

/**
 * Filters out steps whose target is not in the DOM.
 */
export const buildTourSteps = (steps: DriveStep[] = TOUR_STEPS): DriveStep[] =>
  genericBuildTourSteps(steps);
