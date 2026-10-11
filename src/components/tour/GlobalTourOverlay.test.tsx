import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GlobalTourOverlay } from './GlobalTourOverlay';
import { useTourStore } from '@/services/tour/tourStore';
import * as driverJs from 'driver.js';

const driveMock = vi.fn();
const destroyMock = vi.fn();
let capturedConfig: driverJs.Config | undefined;

vi.mock('driver.js', () => ({
  driver: vi.fn((config?: driverJs.Config) => {
    capturedConfig = config;
    return {
      isActive: () => true,
      drive: driveMock,
      destroy: destroyMock,
      setConfig: vi.fn(),
      setSteps: vi.fn(),
      getConfig: vi.fn(),
      getState: vi.fn(),
      getActiveIndex: vi.fn(),
      isFirstStep: vi.fn(),
      isLastStep: vi.fn(),
      getActiveStep: vi.fn(),
      getActiveElement: vi.fn(),
      getPreviousElement: vi.fn(),
      getPreviousStep: vi.fn(),
      getNextStep: vi.fn(),
      moveNext: vi.fn(),
      movePrevious: vi.fn(),
      moveTo: vi.fn(),
      hasNextStep: vi.fn(),
      hasPreviousStep: vi.fn(),
      highlight: vi.fn(),
      refresh: vi.fn(),
    };
  }),
}));

const renderWithRouter = (initialPath = '/') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <GlobalTourOverlay />
    </MemoryRouter>
  );

describe('GlobalTourOverlay', () => {
  beforeEach(() => {
    localStorage.clear();
    useTourStore.getState().resetAllTours();
    driveMock.mockClear();
    destroyMock.mockClear();
    capturedConfig = undefined;
    document.body.innerHTML = `
      <div class="tour-landing-welcome"></div>
      <div class="tour-landing-stats"></div>
      <div class="tour-landing-practice"></div>
      <div class="tour-landing-studio"></div>
    `;
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('automatically starts tour for route and invokes driver.drive()', async () => {
    renderWithRouter('/');

    await waitFor(
      () => {
        expect(useTourStore.getState().isRunning).toBe(true);
        expect(useTourStore.getState().activeTourId).toBe('tour_landing');
        expect(driveMock).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    expect(capturedConfig).toBeDefined();
    expect(capturedConfig?.animate).toBe(true);
    expect(capturedConfig?.showProgress).toBe(true);
    expect(capturedConfig?.allowClose).toBe(true);
  });

  it('marks tour complete in store when onDestroyStarted callback fires', async () => {
    renderWithRouter('/');

    await waitFor(
      () => {
        expect(capturedConfig).toBeDefined();
      },
      { timeout: 3000 }
    );

    // Simulate tour close / destroy
    act(() => {
      capturedConfig?.onDestroyStarted?.(undefined, {} as any, {} as any);
    });

    expect(useTourStore.getState().isRunning).toBe(false);
    expect(useTourStore.getState().preferences.completedTours['tour_landing']).toBe(true);
  });

  it('dispatches tour:switch-mobile-tab on onHighlightStarted when mobileTab is defined', async () => {
    document.body.innerHTML = `
      <div class="tour-studio-intro"></div>
      <div class="tour-studio-job-add"></div>
      <div class="tour-studio-tailoring"></div>
      <div class="tour-studio-chat-context"></div>
      <div class="tour-studio-chat-input"></div>
      <div class="tour-studio-career-knowledge"></div>
      <div class="tour-studio-preview-mode"></div>
      <div class="tour-studio-export-pdf"></div>
    `;

    renderWithRouter('/studio');

    const eventListener = vi.fn();
    window.addEventListener('tour:switch-mobile-tab', eventListener);

    await waitFor(
      () => {
        expect(capturedConfig).toBeDefined();
      },
      { timeout: 3000 }
    );

    act(() => {
      capturedConfig?.onHighlightStarted?.(
        undefined,
        { element: '.test', mobileTab: 'preview' } as any,
        {} as any
      );
    });

    expect(eventListener).toHaveBeenCalled();
    const event = eventListener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ tab: 'preview' });

    window.removeEventListener('tour:switch-mobile-tab', eventListener);
  });
});
