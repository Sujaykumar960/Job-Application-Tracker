import { test, expect } from '@playwright/test';
import { loginAsSeeker } from './helpers/auth';

test.describe('CareerX Failure Modes, Errors & Resilience Suite', () => {

  test('1. Navigating to non-existent route renders 404 page gracefully', async ({ page }) => {
    await loginAsSeeker(page);

    // Navigate to a deliberately invalid route
    await page.goto('/this-route-does-not-exist-404');

    // Verify NotFoundPage is rendered
    await expect(page.locator('text=404').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Page Not Found')).toBeVisible();

    // Verify "Back to Dashboard" button exists and works
    const backBtn = page.locator('button:has-text("Back to Dashboard")');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Successfully returns to dashboard without crash
    await expect(page).toHaveURL('/');
  });

  test('2. 401 Unauthorized handling clears invalid session and redirects to /login', async ({ page }) => {
    await loginAsSeeker(page);

    // Invalidate the JWT token in localStorage
    await page.evaluate(() => {
      localStorage.setItem('careerx_auth_token', 'invalid_expired_token_12345');
    });

    // Refresh or navigate to trigger an authenticated API call
    await page.goto('/applications');

    // Interceptor catches 401 and redirects to login
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('3. Application handles malformed query parameters without crashing', async ({ page }) => {
    await loginAsSeeker(page);

    // Supply malformed query parameters to jobs and learning
    await page.goto('/jobs?sort=unknown&filter=%00%FF');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 10000 });

    await page.goto('/learning?category=%20%20&difficulty=invalidLevel');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 10000 });
  });

});
