import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UploadTab } from './UploadTab';

const baseProps = {
  uploadId: 'abcd1234abcd1234',
  uploadPassword: 'hunter2hunter2',
  showPassword: false,
  includeApiKey: false,
  isLoading: false,
  setUploadId: vi.fn(),
  setUploadPassword: vi.fn(),
  setShowPassword: vi.fn(),
  setIncludeApiKey: vi.fn(),
  generateNewId: vi.fn(),
  handleCopyId: vi.fn(),
  handleUpload: vi.fn(),
};

const renderTab = (overrides: Partial<typeof baseProps> = {}) =>
  render(
    <TooltipProvider>
      <UploadTab {...baseProps} {...overrides} />
    </TooltipProvider>
  );

describe('UploadTab password visibility toggle', () => {
  it('offers the reveal action while the password is hidden', () => {
    renderTab();

    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toBeDefined();
  });

  it('offers the hide action once the password is visible', () => {
    renderTab({ showPassword: true });

    expect(screen.getByRole('button', { name: 'Hide password' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Show password' })).toBeNull();
  });

  it('does not also announce the state through aria-pressed', () => {
    renderTab({ showPassword: true });

    const toggle = screen.getByRole('button', { name: 'Hide password' });
    expect(toggle).not.toHaveAttribute('aria-pressed');
  });

  it('mirrors the current visibility onto the input type', () => {
    const { unmount } = renderTab();
    expect(screen.getByLabelText(/Protection Password/)).toHaveAttribute('type', 'password');
    unmount();

    renderTab({ showPassword: true });
    expect(screen.getByLabelText(/Protection Password/)).toHaveAttribute('type', 'text');
  });

  it('toggles visibility on click', () => {
    const setShowPassword = vi.fn();
    renderTab({ setShowPassword });

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(setShowPassword).toHaveBeenCalledWith(true);
  });
});
