import { test, expect } from '@playwright/test';
import { loginAsSeeker, logout } from './helpers/auth';

test.describe('CareerX Authentication & Authorization Suite', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`[BROWSER PAGEERROR] ${err.message}`));
    page.on('request', (req) => console.log(`[BROWSER REQ] ${req.method()} ${req.url()}`));
    page.on('requestfailed', (req) => console.log(`[BROWSER REQ FAILED] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`));
  });

  test('1. Redirects unauthenticated users from protected routes to /login', async ({ page }) => {
    // Attempt visiting protected routes
    await page.goto('/applications');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/resume');
    await expect(page).toHaveURL(/\/login/);
  });

  test('2. Displays validation errors for empty and invalid login inputs', async ({ page }) => {
    await page.goto('/login');

    // Click submit with empty fields
    await page.locator('button[type="submit"]').click();

    // Check for validation error messages
    await expect(page.locator('text=Email address is required')).toBeVisible();

    // Fill invalid email format
    await page.locator('input[type="email"], #email-address').fill('invalid-email-format');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
  });

  test('3. Displays error message for incorrect credentials', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await page.locator('input[type="email"], #email-address').fill('seeker@careerx.com');
    await page.locator('input[type="password"]').fill('WrongPassword999!');

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/login'),
      { timeout: 15000 }
    );
    await page.locator('button[type="submit"]').click();
    await responsePromise;

    // Verify error banner is visible
    const errorAlert = page.locator('[data-testid="auth-error-alert"], [role="alert"]');
    await expect(errorAlert.first()).toBeVisible({ timeout: 10000 });
    await expect(errorAlert.first()).toContainText(/invalid/i);
    // Verify user remains on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('4. Logs in successfully with valid credentials and redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"], #email-address').fill('seeker@careerx.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();

    // Should redirect away from /login to / or /dashboard
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    // Verify authenticated user menu and welcome header are rendered
    const userMenu = page.locator('button[aria-haspopup="true"]');
    await expect(userMenu).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Welcome back, Alice').first()).toBeVisible({ timeout: 10000 });
  });

  test('5. Retains authenticated session across full browser reload', async ({ page }) => {
    await loginAsSeeker(page);

    // Verify we are logged in
    await expect(page.locator('button[aria-haspopup="true"]')).toBeVisible();

    // Reload page
    await page.reload();

    // Ensure user remains authenticated without redirecting to /login
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('button[aria-haspopup="true"]')).toBeVisible({ timeout: 10000 });
  });

  test('6. Registers a new seeker account with valid credentials', async ({ page }) => {
    const uniqueEmail = `newseeker_${Date.now()}@careerx.com`;

    await page.goto('/register');
    await expect(page.locator('text=Create your CareerX Account')).toBeVisible();

    // Fill form
    await page.locator('#full-name, input[placeholder*="Alex"]').fill('Daniel Seeker');
    await page.locator('input[type="email"], #email-address').fill(uniqueEmail);
    // Role defaults to seeker
    await page.locator('#password, input[name="password"]').fill('SecurePass123!');
    await page.locator('#confirm-password, input[name="confirmPassword"]').fill('SecurePass123!');

    await page.locator('button[type="submit"]').click();

    // Should redirect to dashboard upon successful registration
    await expect(page).not.toHaveURL(/\/register/, { timeout: 15000 });
    await expect(page.locator('button[aria-haspopup="true"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Welcome back, Daniel').first()).toBeVisible({ timeout: 10000 });
  });

  test('7. Registers a new recruiter account with valid credentials', async ({ page }) => {
    const uniqueEmail = `newrecruiter_${Date.now()}@careerx.com`;

    await page.goto('/register');

    // Fill form
    await page.locator('#full-name, input[placeholder*="Alex"]').fill('Rachel Talent');
    await page.locator('input[type="email"], #email-address').fill(uniqueEmail);

    // Select Recruiter role
    await page.locator('button:has-text("Recruiter")').click();

    await page.locator('#password, input[name="password"]').fill('SecurePass123!');
    await page.locator('#confirm-password, input[name="confirmPassword"]').fill('SecurePass123!');

    await page.locator('button[type="submit"]').click();

    // Should redirect to dashboard upon successful registration
    await expect(page).not.toHaveURL(/\/register/, { timeout: 15000 });
    await expect(page.locator('button[aria-haspopup="true"]')).toBeVisible({ timeout: 10000 });
  });

  test('8. Enforces minimum 8 characters password length on registration', async ({ page }) => {
    await page.goto('/register');

    await page.locator('#full-name, input[placeholder*="Alex"]').fill('Short Pass');
    await page.locator('input[type="email"], #email-address').fill('shortpass@careerx.com');
    await page.locator('#password, input[name="password"]').fill('12345');
    await page.locator('#confirm-password, input[name="confirmPassword"]').fill('12345');

    await page.locator('button[type="submit"]').click();

    // Expect validation message for password min length
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('9. Successfully logs out and revokes access to protected routes', async ({ page }) => {
    await loginAsSeeker(page);

    // Logout
    await logout(page);

    // Ensure on login page
    await expect(page).toHaveURL(/\/login/);

    // Try navigating back to protected route
    await page.goto('/applications');
    await expect(page).toHaveURL(/\/login/);
  });

  test('10. Seeker visiting /recruiter displays role warning banner', async ({ page }) => {
    await loginAsSeeker(page);

    // Navigate to recruiter portal
    await page.goto('/recruiter');

    // Seeker should see warning banner
    const roleNotice = page.locator('text=You are currently viewing as seeker');
    await expect(roleNotice).toBeVisible({ timeout: 10000 });
  });

});
