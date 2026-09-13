import { test, expect } from '@playwright/test';
import { loginAsSeeker } from './helpers/auth';
import path from 'path';

test.describe('CareerX Seeker End-to-End User Journey', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`[BROWSER PAGEERROR] ${err.message}`));
    await loginAsSeeker(page);
  });

  test('1. Views Executive Career Dashboard with real aggregated metrics', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify dashboard header and core widgets
    await expect(page.locator('h1:has-text("CareerX Command Center")')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Total Apps').first()).toBeVisible();
    await expect(page.getByText('Application Pipeline').first()).toBeVisible();
  });

  test('2. Explores job marketplace, filters by keyword, and submits an application', async ({ page }) => {
    await page.goto('/jobs');

    // Verify jobs load
    await expect(page.locator('text=Senior Frontend Engineer').first()).toBeVisible({ timeout: 15000 });

    // Filter jobs using search input
    const searchInput = page.locator('input[placeholder*="Search by title"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Frontend');
    }

    // Verify filtered result remains visible
    await expect(page.locator('text=Senior Frontend Engineer').first()).toBeVisible();

    // Click Apply button on the job card if not already applied
    const applyButton = page.locator('button:text-is("Apply"), button:has-text("Apply")').first();
    if (await applyButton.isVisible()) {
      await applyButton.click();
    }

    // Verify toast or button state confirmation
    await expect(
      page.locator('button:has-text("Applied"), div:has-text("Application submitted")').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('3. Confirms submitted job application is tracked in Applications pipeline', async ({ page }) => {
    await page.goto('/applications');

    // Verify application appears in tracker
    await expect(page.locator('text=TechNova Solutions').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Senior Frontend Engineer').first()).toBeVisible();
    await expect(page.locator('text=Applied').first()).toBeVisible();
  });

  test('4. Uploads valid PDF resume and verifies resume library persistence', async ({ page }) => {
    await page.goto('/resume');

    // Locate hidden file input and upload sample PDF fixture
    const fileInput = page.locator('input[type="file"]');
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/sample_resume.pdf');
    await fileInput.setInputFiles(fixturePath);

    // Verify resume item appears in library
    await expect(
      page.getByText('sample_resume.pdf').first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('5. Navigates to Skill Gap analysis and inspects competencies', async ({ page }) => {
    await page.goto('/skills');

    // Verify Skill Gap page header and content
    await expect(page.locator('h1:has-text("Skill Gap")')).toBeVisible({ timeout: 15000 });
    // Verify core tech skills/metrics are rendered
    await expect(page.getByText('Total Profile Skills').first()).toBeVisible();
  });

  test('6. Explores Learning Hub, opens syllabus, completes a lesson, and verifies progress', async ({ page }) => {
    await page.goto('/learning');

    // Wait for courses to load
    await expect(page.locator('text=Event-Driven Architecture & Partitioning with Apache Kafka').first()).toBeVisible({ timeout: 15000 });

    // Open course detail modal
    await page.locator('text=Event-Driven Architecture & Partitioning with Apache Kafka').first().click();

    // Verify modal is open
    await expect(page.locator('text=Course Syllabus').first()).toBeVisible({ timeout: 10000 });

    // Click "Complete Lesson"
    const completeBtn = page.locator('button:has-text("Complete Lesson")').first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
      // Verify lesson state toggled to Mark Incomplete or Done
      await expect(page.locator('button:has-text("Mark Incomplete"), button:has-text("Done")').first()).toBeVisible({ timeout: 10000 });
    }

    // Close modal
    const closeBtn = page.locator('button[aria-label="Close modal"], button:has-text("Close")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('7. Interacts with Community Feed: publishes post and toggles like', async ({ page }) => {
    await page.goto('/feed');

    const postContent = `E2E Automated verification post ${Date.now()}`;

    // Fill post textarea
    const postTextarea = page.locator('textarea[placeholder*="Share an achievement"], textarea').first();
    await expect(postTextarea).toBeVisible({ timeout: 15000 });
    await postTextarea.fill(postContent);

    // Click Publish button
    await page.locator('button:text-is("Publish"), button:has-text("Publish")').first().click();

    // Verify new post appears in feed
    await expect(page.getByText(postContent).first()).toBeVisible({ timeout: 15000 });

    // Like the post
    const postCard = page.locator(`div:has-text("${postContent}")`).last();
    const likeButton = postCard.locator('button:has(svg.lucide-heart)').first();
    if (await likeButton.isVisible()) {
      await likeButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('8. Creates new Calendar milestone and verifies persistence across page reload', async ({ page }) => {
    await page.goto('/calendar');

    // Verify pre-seeded event is visible
    await expect(page.locator('text=CareerX Technical Interview Prep').first()).toBeVisible({ timeout: 15000 });

    // Click Add Event button
    await page.locator('button:has-text("Add Event")').first().click();

    // Verify modal open
    await expect(page.locator('text=Schedule Calendar Milestone').first()).toBeVisible();

    // Fill form
    const eventTitle = `Technical Mock Loop ${Date.now()}`;
    await page.locator('input[placeholder*="Stripe Technical Onsite Loop"]').fill(eventTitle);
    await page.locator('input[type="date"]').fill('2026-09-25');
    await page.locator('input[placeholder*="10:00 AM"]').fill('03:30 PM');

    // Submit
    await page.locator('button:has-text("Save to Calendar")').first().click();

    // Verify event appears in calendar
    await expect(page.locator(`text=${eventTitle}`).first()).toBeVisible({ timeout: 10000 });

    // Refresh page to verify persistence from MongoDB
    await page.reload();
    await expect(page.locator(`text=${eventTitle}`).first()).toBeVisible({ timeout: 15000 });
  });

});
