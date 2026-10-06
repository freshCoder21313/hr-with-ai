import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BasicsForm from './BasicsForm';
import WorkForm from './WorkForm';
import { Basics, Work } from '@/types/resume';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('Progressive Disclosure in Section Forms', () => {
  describe('BasicsForm', () => {
    it('initially hides optional location & photo when empty, and expands on button click', () => {
      const initialBasics: Basics = {
        name: 'Alex Morgan',
        label: 'Staff Engineer',
        email: 'alex@example.com',
        phone: '123456789',
        summary: 'Experienced engineer...',
      };
      const onChange = vi.fn();

      render(<BasicsForm data={initialBasics} onChange={onChange} />);

      // Core fields are always visible
      expect(screen.getByDisplayValue('Alex Morgan')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Staff Engineer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('alex@example.com')).toBeInTheDocument();

      // Optional fields should NOT be in the document initially
      expect(screen.queryByLabelText(/Profile Image URL/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/City/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Country Code/i)).not.toBeInTheDocument();

      // Toggle button is visible
      const toggleBtn = screen.getByRole('button', { name: /\+ Add Location & Photo/i });
      expect(toggleBtn).toBeInTheDocument();

      // Click to expand
      fireEvent.click(toggleBtn);

      // Now optional fields are visible
      expect(screen.getByLabelText(/Profile Image URL/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Country Code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hide Location & Photo/i })).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(screen.getByRole('button', { name: /Hide Location & Photo/i }));
      expect(screen.queryByLabelText(/Profile Image URL/i)).not.toBeInTheDocument();
    });

    it('auto-expands optional fields if resume already has location or photo data', () => {
      const populatedBasics: Basics = {
        name: 'Jane Doe',
        location: { city: 'Tokyo', countryCode: 'JP' },
      };
      const onChange = vi.fn();

      render(<BasicsForm data={populatedBasics} onChange={onChange} />);

      // Auto-expanded
      expect(screen.getByDisplayValue('Tokyo')).toBeInTheDocument();
      expect(screen.getByDisplayValue('JP')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hide Location & Photo/i })).toBeInTheDocument();
    });
  });

  describe('WorkForm & GenericSectionForm Accordion', () => {
    it('collapses subsequent entries by default and expands on click or toggle all', () => {
      const mockWork: Work[] = [
        {
          name: 'Tech Corp',
          position: 'Lead Developer',
          startDate: '2022-01',
          endDate: 'Present',
          summary: 'Built systems',
        },
        {
          name: 'Startup Inc',
          position: 'Software Engineer',
          startDate: '2020-01',
          endDate: '2021-12',
          summary: 'Early stage work',
        },
      ];
      const onChange = vi.fn();

      render(
        <TooltipProvider>
          <WorkForm data={mockWork} onChange={onChange} />
        </TooltipProvider>
      );

      // Entry 0 is expanded: inputs are visible
      expect(screen.getByDisplayValue('Built systems')).toBeInTheDocument();

      // Entry 1 is collapsed: summary textarea is NOT rendered, but header & subtitle are rendered
      expect(screen.queryByDisplayValue('Early stage work')).not.toBeInTheDocument();
      expect(screen.getByText('Startup Inc')).toBeInTheDocument();
      expect(
        screen.getByText('Software Engineer • 2020-01 - 2021-12')
      ).toBeInTheDocument();

      // Click entry 1 to expand it
      fireEvent.click(screen.getByText('Startup Inc'));
      expect(screen.getByDisplayValue('Early stage work')).toBeInTheDocument();

      // Use Collapse All button
      const collapseAllBtn = screen.getByRole('button', { name: /Collapse All/i });
      fireEvent.click(collapseAllBtn);
      expect(screen.queryByDisplayValue('Built systems')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('Early stage work')).not.toBeInTheDocument();

      // Use Expand All button
      const expandAllBtn = screen.getByRole('button', { name: /Expand All/i });
      fireEvent.click(expandAllBtn);
      expect(screen.getByDisplayValue('Built systems')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Early stage work')).toBeInTheDocument();
    });
  });
});
