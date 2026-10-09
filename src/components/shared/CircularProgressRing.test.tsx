import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircularProgressRing } from './CircularProgressRing';

describe('CircularProgressRing', () => {
  it('renders percentage and title correctly', () => {
    render(
      <CircularProgressRing
        progress={45}
        title="Analyzing responses"
        subtitle="Please wait a moment"
      />
    );

    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
    expect(screen.getByText('Analyzing responses')).toBeInTheDocument();
    expect(screen.getByText('Please wait a moment')).toBeInTheDocument();
  });

  it('clamps progress between 0 and 100', () => {
    const { rerender } = render(<CircularProgressRing progress={-10} />);
    expect(screen.getByText('0')).toBeInTheDocument();

    rerender(<CircularProgressRing progress={120} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('provides accessible progressbar semantics and live region', () => {
    render(
      <CircularProgressRing progress={65} title="Analyzing interview" subtitle="Extracting turns" />
    );
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '65');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-label', 'Analyzing interview');
  });
});
