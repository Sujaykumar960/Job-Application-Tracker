import { Page, expect } from '@playwright/test';

export async function loginAsSeeker(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="email"], #email-address').fill('seeker@careerx.com');
  await page.locator('input[type="password"]').fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
}

export async function loginAsRecruiter(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="email"], #email-address').fill('recruiter@careerx.com');
  await page.locator('input[type="password"]').fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
}

export async function loginAsSeeker2(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="email"], #email-address').fill('seeker2@careerx.com');
  await page.locator('input[type="password"]').fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
}

export async function logout(page: Page) {
  // Open user menu
  const userMenuTrigger = page.locator('button[aria-haspopup="true"]');
  if (await userMenuTrigger.isVisible()) {
    await userMenuTrigger.click();
    await page.locator('button:has-text("Sign Out")').click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  } else {
    // Direct token purge if menu not present
    await page.evaluate(() => {
      localStorage.removeItem('careerx_auth_token');
      localStorage.removeItem('careerx_auth_user');
      window.location.href = '/login';
    });
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  }
}
