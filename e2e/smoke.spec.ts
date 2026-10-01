import { test, expect } from '@playwright/test';

/**
 * Critical-path smokes (Phase 3). HashRouter → URLs use /#/...
 */
test.describe('smoke journeys', () => {
  test('landing page loads with primary CTA', async ({ page }) => {
    // Pre-seed localStorage to bypass onboarding ApiKeyModal dialog
    await page.addInitScript(() => {
      localStorage.setItem('ai_active_profile_id', 'e2e_profile');
      localStorage.setItem('ai_setup_banner_dismissed', 'true');
    });

    await page.goto('/#/');

    await expect(page).toHaveTitle(/HR|Interview|AI/i);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('button').or(page.getByRole('link')).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('setup room form is reachable', async ({ page }) => {
    await page.goto('/#/setup');
    // Setup room uses job/title fields
    await expect(page.getByText(/Setup Interview|Job|Company|Resume/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('history page loads without crash', async ({ page }) => {
    await page.goto('/#/history');
    await expect(page.locator('body')).toBeVisible();
    // Should not show a blank white error screen
    await expect(page.locator('body')).not.toContainText('Unexpected Application Error');
  });

  test('settings dialog shows the AI Provider Profiles section', async ({ page }) => {
    // Pre-seed localStorage to bypass onboarding ApiKeyModal, which is also
    // titled "AI Provider Profiles" and would otherwise aria-hide the header.
    await page.addInitScript(() => {
      localStorage.setItem('ai_active_profile_id', 'e2e_profile');
      localStorage.setItem('ai_setup_banner_dismissed', 'true');
    });

    await page.goto('/#/');

    const settingsBtn = page.getByRole('button', { name: 'Settings' }).first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Scope to the dialog: the ApiKeyModal shares the same heading text.
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('AI Provider Profiles', { exact: true })).toBeVisible();
  });
});
