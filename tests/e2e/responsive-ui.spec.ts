import { test, expect } from '@playwright/test';
import { loginAsSeeker } from './helpers/auth';

const VIEWPORTS = [
  { name: 'Desktop', width: 1280, height: 720 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Compact Mobile', width: 320, height: 568 },
];

test.describe('CareerX Responsive UI & Cross-Device Viewport Suite', () => {

  for (const vp of VIEWPORTS) {
    test(`Verify ${vp.name} (${vp.width}x${vp.height}) layout integrity and no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Check Login Page responsiveness
      await page.goto('/login');
      await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });

      let hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll, `Horizontal overflow detected on /login at ${vp.name}`).toBe(false);

      // 2. Authenticate and check Dashboard
      await loginAsSeeker(page);
      await page.goto('/dashboard');
      await expect(page.locator('h1:has-text("Career"), :has-text("CareerX")').first()).toBeVisible({ timeout: 15000 });

      hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll, `Horizontal overflow detected on /dashboard at ${vp.name}`).toBe(false);

      // 3. Check Jobs marketplace
      await page.goto('/jobs');
      await expect(page.locator('text=Senior Frontend Engineer').first()).toBeVisible({ timeout: 15000 });

      hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll, `Horizontal overflow detected on /jobs at ${vp.name}`).toBe(false);

      // 4. Check Applications Tracker
      await page.goto('/applications');
      await expect(page.locator('h1, :has-text("Applications")').first()).toBeVisible({ timeout: 15000 });

      hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll, `Horizontal overflow detected on /applications at ${vp.name}`).toBe(false);

      // 5. Check Community Feed
      await page.goto('/feed');
      await expect(page.locator('textarea, button:has-text("Publish")').first()).toBeVisible({ timeout: 15000 });

      hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll, `Horizontal overflow detected on /feed at ${vp.name}`).toBe(false);
    });
  }

});
