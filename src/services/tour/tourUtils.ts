import type { DriveStep } from 'driver.js';
import type { TourStepWithMeta } from './tourSteps';

/**
 * Terminal driver.js / tour exit conditions.
 */
const TERMINAL_STATUS: Record<string, true> = {
  finished: true,
  skipped: true,
  error: true,
  close: true,
  destroyed: true,
};

/**
 * Checks if a given tour status represents an exit / completed state.
 */
export const isTerminalTourStatus = (status: string): boolean => {
  return TERMINAL_STATUS[status] === true;
};

/**
 * Filters out steps whose target DOM element is not present in the document.
 * Steps targeting 'body' or without a specific element selector are retained.
 * Steps with tab-switching metadata are also retained so dynamic tab switches can render them.
 */
export const buildTourSteps = <T extends DriveStep>(steps: T[]): T[] => {
  if (typeof document === 'undefined') return steps;

  return steps.filter((step) => {
    if (!step.element || step.element === 'body') return true;

    const metaStep = step as TourStepWithMeta;
    if (metaStep.mobileTab || metaStep.settingsTab || metaStep.drawerTab) {
      return true;
    }

    if (typeof step.element === 'string') {
      try {
        return Boolean(document.querySelector(step.element));
      } catch {
        return false;
      }
    }

    if (step.element instanceof HTMLElement) {
      return document.body.contains(step.element);
    }

    if (typeof step.element === 'function') {
      try {
        const el = step.element();
        return Boolean(el && document.body.contains(el));
      } catch {
        return false;
      }
    }

    return false;
  });
};
