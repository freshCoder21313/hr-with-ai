import { describe, it, expect, beforeEach } from 'vitest';
import { useTourStore, TOUR_STORAGE_KEY } from './tourStore';

describe('useTourStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useTourStore.getState().resetAllTours();
  });

  it('initializes with default preferences', () => {
    const state = useTourStore.getState();
    expect(state.preferences.dismissedAllTours).toBe(false);
    expect(state.preferences.completedTours).toEqual({});
    expect(state.isRunning).toBe(false);
    expect(state.activeTourId).toBeNull();
    expect(state.stepIndex).toBe(0);
  });

  it('starts a tour when not dismissed and not yet completed', () => {
    useTourStore.getState().startTour('tour_landing');
    const state = useTourStore.getState();
    expect(state.isRunning).toBe(true);
    expect(state.activeTourId).toBe('tour_landing');
    expect(state.stepIndex).toBe(0);
  });

  it('does not start automatically if tour is already completed, unless forced', () => {
    useTourStore.getState().completeTour('tour_landing');
    expect(useTourStore.getState().preferences.completedTours['tour_landing']).toBe(true);

    // Try auto start
    useTourStore.getState().startTour('tour_landing');
    expect(useTourStore.getState().isRunning).toBe(false);

    // Force start (e.g. clicking '?' button)
    useTourStore.getState().startTour('tour_landing', true);
    expect(useTourStore.getState().isRunning).toBe(true);
    expect(useTourStore.getState().activeTourId).toBe('tour_landing');
  });

  it('does not start automatically if dismissedAllTours is true, unless forced', () => {
    useTourStore.getState().dismissAllTours();
    expect(useTourStore.getState().preferences.dismissedAllTours).toBe(true);

    // Try auto start
    useTourStore.getState().startTour('tour_studio');
    expect(useTourStore.getState().isRunning).toBe(false);

    // Force start
    useTourStore.getState().startTour('tour_studio', true);
    expect(useTourStore.getState().isRunning).toBe(true);
  });

  it('stops tour and updates stepIndex', () => {
    useTourStore.getState().startTour('tour_setup', true);
    useTourStore.getState().setStepIndex(2);
    expect(useTourStore.getState().stepIndex).toBe(2);

    useTourStore.getState().stopTour();
    expect(useTourStore.getState().isRunning).toBe(false);
    expect(useTourStore.getState().stepIndex).toBe(0);
  });

  it('persists preferences to localStorage', () => {
    useTourStore.getState().completeTour('tour_studio');
    const raw = localStorage.getItem(TOUR_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.completedTours['tour_studio']).toBe(true);
  });

  it('resets all tours', () => {
    useTourStore.getState().completeTour('tour_landing');
    useTourStore.getState().dismissAllTours();

    useTourStore.getState().resetAllTours();
    const state = useTourStore.getState();
    expect(state.preferences.dismissedAllTours).toBe(false);
    expect(state.preferences.completedTours).toEqual({});
  });
});
