import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Step } from 'react-joyride';
import {
  buildTourSteps,
  isTerminalTourStatus,
  TOUR_COMPLETED_KEY,
  TOUR_STEPS,
} from './resumeBuilderTour';

describe('buildTourSteps', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps only steps whose target exists, always keeping the intro', () => {
    document.body.innerHTML = `<div class="tour-preview-toggle"></div>`;
    const steps: Step[] = [
      { target: 'body', content: 'intro' },
      { target: '.tour-magic-format', content: 'magic' },
      { target: '.tour-preview-toggle', content: 'preview' },
      { target: '.tour-fab', content: 'fab' },
    ];

    expect(buildTourSteps(steps).map((step) => step.target)).toEqual([
      'body',
      '.tour-preview-toggle',
    ]);
  });

  it('never leaves the tour with steps pointing at missing targets', () => {
    document.body.innerHTML = `<div class="tour-fab"></div>`;

    const resolved = buildTourSteps(TOUR_STEPS);

    expect(resolved.length).toBeGreaterThan(1);
    resolved.slice(1).forEach((step) => {
      expect(document.querySelector(step.target as string)).not.toBeNull();
    });
  });

  it('drops a step whose selector is invalid instead of throwing', () => {
    const steps: Step[] = [
      { target: 'body', content: 'intro' },
      { target: '::::', content: 'broken' },
    ];

    expect(buildTourSteps(steps)).toHaveLength(1);
  });
});

describe('isTerminalTourStatus', () => {
  it('treats every way out of the tour as completion', () => {
    ['finished', 'skipped', 'error', 'close'].forEach((status) => {
      expect(isTerminalTourStatus(status)).toBe(true);
    });
  });

  it('does not treat an in-progress step as completion', () => {
    ['init', 'ready', 'beacon', 'started', 'running', 'waiting', 'paused'].forEach((status) => {
      expect(isTerminalTourStatus(status)).toBe(false);
    });
  });
});

describe('TOUR_COMPLETED_KEY', () => {
  it('keeps the historical storage key', () => {
    expect(TOUR_COMPLETED_KEY).toBe('hasSeenResumeBuilderTour');
  });
});
