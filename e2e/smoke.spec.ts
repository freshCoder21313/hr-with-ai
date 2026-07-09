import { test, expect } from '@playwright/test';

/**
 * Critical-path smokes (Phase 3). HashRouter → URLs use /#/...
 */
test.describe('smoke journeys', () => {
  test('landing page loads with primary CTA', async ({ page }) => {
    await page.goto('/#/');
    await expect(page).toHaveTitle(/HR|Interview|AI/i);
    await expect(page.getByRole('main')).toBeVisible();
    // Landing copy varies; assert a primary action exists
    await expect(
      page.getByRole('button').or(page.getByRole('link')).first()
    ).toBeVisible({ timeout: 15_000 });
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
});
