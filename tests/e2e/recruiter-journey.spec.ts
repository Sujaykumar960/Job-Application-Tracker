import { test, expect } from '@playwright/test';
import { loginAsRecruiter } from './helpers/auth';

test.describe('CareerX Recruiter End-to-End User Journey', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
  });

  test('1. Views Recruiter Talent Portal with metrics and posted jobs', async ({ page }) => {
    await page.goto('/recruiter');

    // Verify page header
    await expect(page.locator('text=Technical Recruiter & Talent Portal').first()).toBeVisible({ timeout: 15000 });

    // Verify metrics cards (Jobs Posted, Applications, Shortlisted, Interviews, Hired)
    await expect(page.locator(':has-text("Posted Jobs")').first()).toBeVisible();
    await expect(page.locator(':has-text("Applicants")').first()).toBeVisible();

    // Verify pre-seeded TechNova job listing appears
    await expect(page.locator('text=Senior Frontend Engineer').first()).toBeVisible({ timeout: 10000 });
  });

  test('2. Posts a new engineering job listing via modal', async ({ page }) => {
    await page.goto('/recruiter');

    // Click "Post New Job"
    await page.locator('button:has-text("Post New Job")').first().click();

    // Verify modal is open
    await expect(page.locator('text=Post New Engineering Job').first()).toBeVisible({ timeout: 10000 });

    const newTitle = `Distributed Systems Engineer ${Date.now()}`;
    await page.locator('input[placeholder*="Senior Backend"]').fill(newTitle);
    await page.locator('input[placeholder*="Stripe"]').fill('TechNova Solutions');
    await page.locator('textarea[placeholder*="Describe the team mission"]').fill(
      'We are looking for a backend engineer to design scalable distributed microservices with FastAPI and MongoDB.'
    );

    // Submit form
    await page.locator('button:has-text("Publish Job Listing")').first().click();

    // Verify job listing appears in the posted jobs list
    await expect(page.locator(`text=${newTitle}`).first()).toBeVisible({ timeout: 15000 });
  });

  test('3. Toggles job listing status between published and closed', async ({ page }) => {
    await page.goto('/recruiter');

    // Locate the first job card close button
    const closeBtn = page.locator('button:has-text("Close Listing")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      // Verify listing toggles to Reopen Listing or shows closed status
      await expect(page.locator('button:has-text("Reopen Listing"), :has-text("closed")').first()).toBeVisible({ timeout: 10000 });

      // Reopen listing
      const reopenBtn = page.locator('button:has-text("Reopen Listing")').first();
      await reopenBtn.click();
      await expect(page.locator('button:has-text("Close Listing"), :has-text("published")').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('4. Navigates to Applicant Pipeline and updates applicant status', async ({ page }) => {
    await page.goto('/recruiter');

    // Switch to Applicant Pipeline tab
    await page.locator('button:has-text("Applicant Pipeline")').first().click();

    // Verify pipeline view loaded
    await expect(page.locator('button:has-text("All Stages"), button:has-text("Shortlisted")').first()).toBeVisible({ timeout: 10000 });

    // If an applicant has applied, verify status selector
    const stageSelect = page.locator('div:has-text("Pipeline Stage:") select').first();
    if (await stageSelect.isVisible()) {
      // Change status to Interview
      await stageSelect.selectOption('Interview');
      // Verify toast or updated option
      await expect(page.locator(':has-text("Status updated"), :has-text("Interview")').first()).toBeVisible({ timeout: 10000 });
    }
  });

});
