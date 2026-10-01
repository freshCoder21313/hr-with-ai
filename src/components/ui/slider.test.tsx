import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Slider } from './slider';

beforeAll(() => {
  // Radix's slider measures its thumb via ResizeObserver, which jsdom lacks.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe('Slider labelling', () => {
  it('puts the accessible name on the thumb, not the inert root', () => {
    render(<Slider defaultValue={[5]} aria-label="Recording seconds" aria-valuetext="5 seconds" />);

    const thumb = screen.getByRole('slider');
    expect(thumb).toHaveAttribute('aria-label', 'Recording seconds');
    // aria-valuetext overrides Radix's raw number so the value is announced readably.
    expect(thumb).toHaveAttribute('aria-valuetext', '5 seconds');
    expect(thumb).toHaveAttribute('aria-valuenow', '5');
  });

  it('supports a visible label via aria-labelledby', () => {
    render(
      <>
        <span id="voice-speed-label">Playback speed</span>
        <Slider defaultValue={[1]} aria-labelledby="voice-speed-label" />
      </>
    );

    expect(screen.getByRole('slider')).toHaveAccessibleName('Playback speed');
  });
});
