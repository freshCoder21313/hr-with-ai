import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';
import { useTourStore } from '@/services/tour/tourStore';
import { TOUR_DEFINITIONS, getTourIdForRoute, type TourStepWithMeta } from '@/services/tour/tourSteps';
import { buildTourSteps } from '@/services/tour/tourUtils';

export const GlobalTourOverlay: React.FC = () => {
  const location = useLocation();
  const {
    isRunning,
    activeTourId,
    startTour,
    stopTour,
    completeTour,
  } = useTourStore();

  const driverInstanceRef = useRef<Driver | null>(null);
  const activeTourIdRef = useRef<string | null>(activeTourId);

  useEffect(() => {
    activeTourIdRef.current = activeTourId;
  }, [activeTourId]);

  // Auto-start tour on route entry if applicable
  useEffect(() => {
    const checkAndStartTour = () => {
      const tourId = getTourIdForRoute(location.pathname);
      if (!tourId) return;

      // Do not auto-start background tour if any modal/dialog is currently active
      const hasOpenDialog =
        typeof document !== 'undefined' &&
        Boolean(document.querySelector('[role="dialog"]'));

      if (!hasOpenDialog) {
        startTour(tourId, false);
      }
    };

    // Delay slightly so route components mount and DOM elements are rendered
    const timer = setTimeout(checkAndStartTour, 600);

    const handleCheckEvent = () => checkAndStartTour();
    window.addEventListener('tour:check-auto-start', handleCheckEvent);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('tour:check-auto-start', handleCheckEvent);
    };
  }, [location.pathname, startTour]);

  // Manage driver.js instance lifecycle according to isRunning and activeTourId
  useEffect(() => {
    if (!isRunning || !activeTourId || !TOUR_DEFINITIONS[activeTourId]) {
      if (driverInstanceRef.current?.isActive()) {
        driverInstanceRef.current.destroy();
      }
      return;
    }

    const currentTourId = activeTourId;
    const rawSteps = TOUR_DEFINITIONS[currentTourId] || [];

    const initializeAndDrive = (stepsToRun: TourStepWithMeta[]) => {
      if (stepsToRun.length === 0) {
        stopTour();
        return;
      }

      // Cleanup any previous instance
      if (driverInstanceRef.current?.isActive()) {
        driverInstanceRef.current.destroy();
      }

      const driverObj = driver({
        animate: true,
        smoothScroll: true,
        showProgress: true,
        allowClose: true,
        allowScroll: true,
        stagePadding: 8,
        popoverOffset: 12,
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        doneBtnText: 'Finish',
        steps: stepsToRun,
        onHighlightStarted: (_element, step) => {
          const metaStep = step as TourStepWithMeta;
          if (typeof window !== 'undefined') {
            if (metaStep.mobileTab) {
              window.dispatchEvent(
                new CustomEvent('tour:switch-mobile-tab', {
                  detail: { tab: metaStep.mobileTab },
                })
              );
            }
            if (metaStep.settingsTab) {
              window.dispatchEvent(
                new CustomEvent('tour:switch-settings-tab', {
                  detail: { tab: metaStep.settingsTab },
                })
              );
            }
            if (metaStep.drawerTab) {
              window.dispatchEvent(
                new CustomEvent('tour:switch-drawer-tab', {
                  detail: { tab: metaStep.drawerTab },
                })
              );
            }
          }
        },
        onDestroyStarted: () => {
          // Triggered when close button is clicked, overlay is clicked, or destroy() is called
          const id = activeTourIdRef.current;
          if (id) {
            completeTour(id);
          } else {
            stopTour();
          }
        },
        onDestroyed: () => {
          driverInstanceRef.current = null;
        },
      });

      driverInstanceRef.current = driverObj;
      driverObj.drive();
    };

    // First attempt to build valid steps
    const validSteps = buildTourSteps(rawSteps);
    if (validSteps.length > 0) {
      initializeAndDrive(validSteps);
    } else {
      // Re-probe after a short delay in case DOM elements are still mounting
      const retryTimer = setTimeout(() => {
        const retriedSteps = buildTourSteps(rawSteps);
        initializeAndDrive(retriedSteps);
      }, 150);

      return () => {
        clearTimeout(retryTimer);
      };
    }

    return () => {
      if (driverInstanceRef.current?.isActive()) {
        driverInstanceRef.current.destroy();
      }
    };
  }, [isRunning, activeTourId, completeTour, stopTour]);

  return null;
};
