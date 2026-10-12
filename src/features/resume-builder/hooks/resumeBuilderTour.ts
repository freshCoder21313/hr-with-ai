import type { DriveStep } from 'driver.js';
import { TOUR_BUILDER_STEPS } from '@/services/tour/tourSteps';
import {
  buildTourSteps as genericBuildTourSteps,
  isTerminalTourStatus,
} from '@/services/tour/tourUtils';

export { isTerminalTourStatus };

/**
 * @deprecated Joyride-era localStorage flag. The driver.js migration gates on
 * `completedTours` in `tourStore` instead. Kept for test compat / debugging
 * stale keys left on existing devices.
 */
export const TOUR_COMPLETED_KEY = 'hasSeenResumeBuilderTour';

/** Driver.js steps for the resume builder. */
export const TOUR_STEPS: DriveStep[] = TOUR_BUILDER_STEPS;

/**
 * Filters out steps whose target is not in the DOM.
 */
export const buildTourSteps = (steps: DriveStep[] = TOUR_STEPS): DriveStep[] =>
  genericBuildTourSteps(steps);
