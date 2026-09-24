import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Resume } from '@/types';

// Count renders of BuilderHeader's leaf children. If the memoized BuilderHeader
// bails out on a parent re-render, its render body does not re-execute, so it
// never re-creates these leaf elements and the counter stays flat.
let leafRenderCount = 0;
vi.mock('@/components/ui/button', () => ({
  Button: (props: Record<string, unknown>) => {
    leafRenderCount++;
    return <button data-testid="ui-button">{props.children as React.ReactNode}</button>;
  },
}));
vi.mock('@/components/ui/loading-button', () => ({
  LoadingButton: (props: Record<string, unknown>) => {
    leafRenderCount++;
    return <button data-testid="ui-loading-button">{props.children as React.ReactNode}</button>;
  },
}));

// Imported after the mocks are registered.
import { BuilderHeader } from './BuilderHeader';

const noop = vi.fn();
const fixedResume: Resume = {
  id: 1,
  fileName: 'Test Resume',
  createdAt: Date.now(),
  rawText: 'This is a test resume.',
  parsedData: {
    basics: { name: 'John Doe', email: 'john.doe@email.com', summary: 'A test summary.' },
    work: [],
    education: [],
    skills: [],
    projects: [],
  },
  formatted: true,
};

const Parent: React.FC = () => {
  const [, setTick] = useState(0);
  return (
    <>
      <BuilderHeader
        resume={fixedResume}
        viewMode="editor"
        isProcessing={false}
        onBack={noop}
        onViewModeChange={noop}
        onSmartFormat={noop}
        onSave={noop}
      />
      <button onClick={() => setTick((t) => t + 1)}>bump</button>
    </>
  );
};

describe('BuilderHeader memoization', () => {
  it('does not re-render when parent re-renders with referentially-equal props', () => {
    const { getByText } = render(<Parent />);

    const afterMount = leafRenderCount;
    expect(afterMount).toBeGreaterThan(0); // BuilderHeader rendered on mount

    // Parent re-renders; memoized BuilderHeader receives identical props and bails out.
    fireEvent.click(getByText('bump'));

    expect(leafRenderCount).toBe(afterMount);
  });
});
