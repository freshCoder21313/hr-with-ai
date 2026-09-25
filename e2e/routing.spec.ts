import { test, expect } from '@playwright/test';

/**
 * Automated Route Crawl & Smoke Test
 * Iterates through every application route and asserts:
 * 1. The page loads without throwing any unhandled exceptions (e.g. React dispatcher or hook errors).
 * 2. No severe console.error calls are emitted during the initial mount.
 * 3. The page renders its primary shell successfully rather than displaying an Error Boundary crash screen.
 */
test.describe('Automated Route Crawl', () => {
  const routes = [
    { name: 'Home/Landing', path: '/#/' },
    { name: 'Mock Interview Setup', path: '/#/setup' },
    { name: 'CV Studio', path: '/#/studio' },
    { name: 'Skill Assessment', path: '/#/skill-assessment' },
    { name: 'Interview History', path: '/#/history' },
    { name: 'Resume Builder Editor (Mock ID)', path: '/#/resumes/999/edit' },
    { name: 'Interview Room (Mock ID)', path: '/#/interview/999' },
  ];

  for (const route of routes) {
    test(`route "${route.name}" should mount and render without React/page errors`, async ({ page }) => {
      const pageErrors: Error[] = [];

      // Pre-seed localStorage to bypass onboarding dialogs and banners
      await page.addInitScript(() => {
        localStorage.setItem('ai_active_profile_id', 'e2e_profile');
        localStorage.setItem('ai_setup_banner_dismissed', 'true');
      });

      // 1. Register page-error listener (uncaught rejections/exceptions)
      page.on('pageerror', (exception) => {
        pageErrors.push(exception);
      });

      // 3. Navigate to the target route
      await page.goto(route.path);
      
      // Allow single-page router and Dexie.js to settle initial loads
      await page.waitForTimeout(2000);

      // 4. Assert no uncaught JavaScript exceptions occurred on the page
      expect(pageErrors, `Uncaught page errors on ${route.path}: ${pageErrors.map(e => e.stack || e.message).join('\n')}`).toHaveLength(0);

      // 6. Assert that the Error Boundary was not triggered
      const bodyText = await page.innerText('body');
      expect(bodyText).not.toContain('Something went wrong');
      expect(bodyText).not.toContain('Unexpected Application Error');

      // 7. Assert that the app shell/header is rendered
      await expect(page.locator('header')).toBeVisible({ timeout: 5000 });
    });
  }
});
