import { create } from 'zustand';

export const TOUR_STORAGE_KEY = 'app_tour_preferences';

export interface TourPreferences {
  dismissedAllTours: boolean;
  completedTours: Record<string, boolean>;
}

export interface TourState {
  preferences: TourPreferences;
  activeTourId: string | null;
  isRunning: boolean;
  stepIndex: number;

  // Actions
  startTour: (tourId: string, force?: boolean) => void;
  stopTour: () => void;
  setStepIndex: (index: number) => void;
  completeTour: (tourId: string) => void;
  dismissAllTours: () => void;
  resetAllTours: () => void;
}

const loadPreferences = (): TourPreferences => {
  if (typeof window === 'undefined') {
    return { dismissedAllTours: false, completedTours: {} };
  }
  try {
    const raw = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!raw) return { dismissedAllTours: false, completedTours: {} };
    const parsed = JSON.parse(raw);
    return {
      dismissedAllTours: Boolean(parsed.dismissedAllTours),
      completedTours: parsed.completedTours || {},
    };
  } catch {
    return { dismissedAllTours: false, completedTours: {} };
  }
};

const savePreferences = (preferences: TourPreferences) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Ignore storage quota or access errors
  }
};

export const useTourStore = create<TourState>((set, get) => ({
  preferences: loadPreferences(),
  activeTourId: null,
  isRunning: false,
  stepIndex: 0,

  startTour: (tourId: string, force = false) => {
    const { preferences } = get();

    // If auto-starting and user either dismissed all tours or completed this tour, ignore
    if (!force) {
      if (preferences.dismissedAllTours) return;
      if (preferences.completedTours[tourId]) return;
    }

    set({
      activeTourId: tourId,
      isRunning: true,
      stepIndex: 0,
    });
  },

  stopTour: () => {
    set({
      isRunning: false,
      activeTourId: null,
      stepIndex: 0,
    });
  },

  setStepIndex: (index: number) => {
    set({ stepIndex: index });
  },

  completeTour: (tourId: string) => {
    const { preferences } = get();
    const updated: TourPreferences = {
      ...preferences,
      completedTours: {
        ...preferences.completedTours,
        [tourId]: true,
      },
    };
    savePreferences(updated);
    set({
      preferences: updated,
      isRunning: false,
      activeTourId: null,
      stepIndex: 0,
    });
  },

  dismissAllTours: () => {
    const { preferences } = get();
    const updated: TourPreferences = {
      ...preferences,
      dismissedAllTours: true,
    };
    savePreferences(updated);
    set({
      preferences: updated,
      isRunning: false,
      activeTourId: null,
      stepIndex: 0,
    });
  },

  resetAllTours: () => {
    const updated: TourPreferences = {
      dismissedAllTours: false,
      completedTours: {},
    };
    savePreferences(updated);
    set({
      preferences: updated,
      isRunning: false,
      activeTourId: null,
      stepIndex: 0,
    });
  },
}));
