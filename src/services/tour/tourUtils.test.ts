import { describe, it, expect, beforeEach } from 'vitest';
import type { DriveStep } from 'driver.js';
import { buildTourSteps, isTerminalTourStatus } from './tourUtils';

describe('tourUtils', () => {
  describe('isTerminalTourStatus', () => {
    it('returns true for terminal tour statuses', () => {
      expect(isTerminalTourStatus('finished')).toBe(true);
      expect(isTerminalTourStatus('skipped')).toBe(true);
      expect(isTerminalTourStatus('error')).toBe(true);
      expect(isTerminalTourStatus('close')).toBe(true);
      expect(isTerminalTourStatus('destroyed')).toBe(true);
    });

    it('returns false for intermediate tour statuses', () => {
      expect(isTerminalTourStatus('ready')).toBe(false);
      expect(isTerminalTourStatus('running')).toBe(false);
      expect(isTerminalTourStatus('paused')).toBe(false);
      expect(isTerminalTourStatus('waiting')).toBe(false);
    });
  });

  describe('buildTourSteps', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('always preserves steps targeting "body" or undefined element', () => {
      const steps: DriveStep[] = [
        { element: 'body', popover: { title: 'Welcome!' } },
        { popover: { title: 'Global step' } },
      ];
      expect(buildTourSteps(steps)).toHaveLength(2);
    });

    it('filters out steps whose target elements do not exist in DOM', () => {
      const steps: DriveStep[] = [
        { element: 'body', popover: { title: 'Step 1' } },
        { element: '.non-existent-element', popover: { title: 'Step 2' } },
      ];
      const filtered = buildTourSteps(steps);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].element).toBe('body');
    });

    it('keeps steps whose target elements are present in DOM', () => {
      const targetDiv = document.createElement('div');
      targetDiv.className = 'existing-target';
      document.body.appendChild(targetDiv);

      const steps: DriveStep[] = [
        { element: 'body', popover: { title: 'Step 1' } },
        { element: '.existing-target', popover: { title: 'Step 2' } },
        { element: '.missing-target', popover: { title: 'Step 3' } },
      ];

      const filtered = buildTourSteps(steps);
      expect(filtered).toHaveLength(2);
      expect(filtered[0].element).toBe('body');
      expect(filtered[1].element).toBe('.existing-target');
    });

    it('preserves steps with mobileTab, settingsTab, or drawerTab even if element not yet rendered', () => {
      const steps = [
        { element: '.not-in-dom-yet-1', settingsTab: 'ai-profiles', popover: { title: 'Settings Tab' } },
        { element: '.not-in-dom-yet-2', drawerTab: 'facts', popover: { title: 'Drawer Tab' } },
        { element: '.not-in-dom-yet-3', mobileTab: 'chat', popover: { title: 'Mobile Tab' } },
        { element: '.regular-missing-element', popover: { title: 'Missing' } },
      ];

      const filtered = buildTourSteps(steps as any);
      expect(filtered).toHaveLength(3);
      expect(filtered.map((s) => s.element)).toEqual([
        '.not-in-dom-yet-1',
        '.not-in-dom-yet-2',
        '.not-in-dom-yet-3',
      ]);
    });
  });
});
