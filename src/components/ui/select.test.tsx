import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

describe('SelectContent', () => {
  it('renders portal content above custom application modals', () => {
    render(
      <Select open value="google">
        <SelectTrigger aria-label="Provider">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="google">Google Gemini</SelectItem>
          <SelectItem value="openai">OpenAI Compatible</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByRole('listbox')).toHaveClass('z-[200]');
    expect(screen.getByText('OpenAI Compatible')).toBeVisible();
  });
});
