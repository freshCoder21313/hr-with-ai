import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav';

describe('BottomNav component', () => {
  it('renders all 5 main navigation links on top-level routes', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /home/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /practice/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /cv studio/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /skills/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /history/i })).toBeDefined();
  });

  it('hides when the user is inside an active interview room', () => {
    render(
      <MemoryRouter initialEntries={['/interview/42']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.queryByRole('navigation', { name: /mobile bottom navigation/i })).toBeNull();
  });

  it('hides when the user is inside the resume editor view', () => {
    render(
      <MemoryRouter initialEntries={['/resumes/12/edit']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.queryByRole('navigation', { name: /mobile bottom navigation/i })).toBeNull();
  });
});
