import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

describe('Tabs', () => {
  it('exposes the APG tab pattern when panels are present', () => {
    render(
      <Tabs defaultValue="a" value="a" onValueChange={vi.fn()}>
        <TabsList>
          <TabsTrigger value="a">Alpha</TabsTrigger>
          <TabsTrigger value="b">Beta</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>
    );

    const list = screen.getByRole('tablist');
    expect(list).toHaveAttribute('aria-orientation', 'horizontal');

    const [alpha, beta] = screen.getAllByRole('tab');
    expect(alpha).toHaveAttribute('aria-selected', 'true');
    expect(beta).toHaveAttribute('aria-selected', 'false');
    // Roving tabindex: only the selected tab is in the tab order.
    expect(alpha).toHaveAttribute('tabindex', '0');
    expect(beta).toHaveAttribute('tabindex', '-1');

    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel A');

    alpha.focus();
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(beta);

    fireEvent.keyDown(list, { key: 'Home' });
    expect(document.activeElement).toBe(alpha);
  });

  it('stays a plain segmented switcher when the Tabs root has no panels', () => {
    render(
      <Tabs value="a" onValueChange={vi.fn()}>
        <TabsList>
          <TabsTrigger value="a">Alpha</TabsTrigger>
          <TabsTrigger value="b">Beta</TabsTrigger>
        </TabsList>
      </Tabs>
    );

    // No tabpanel is mounted by this pattern, so claiming tab roles would be a lie.
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument();
  });
});
