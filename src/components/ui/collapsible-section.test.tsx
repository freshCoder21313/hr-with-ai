import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CollapsibleSection } from './collapsible-section';

describe('CollapsibleSection', () => {
  it('toggles through a single header button that reports and links its state', () => {
    render(
      <CollapsibleSection title="Retry Settings" defaultOpen={false}>
        <p>Section body</p>
      </CollapsibleSection>
    );

    // The whole header is one named button; no nested controls inside it.
    const toggle = screen.getByRole('button', { name: 'Retry Settings' });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).not.toHaveAttribute('aria-controls');
    expect(screen.queryByText('Section body')).toBeNull();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const region = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(region).toContainElement(screen.getByText('Section body'));

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Section body')).toBeNull();
  });
});
