import { test, expect } from '@playwright/test';
import { loginAsSeeker, loginAsSeeker2, loginAsRecruiter, logout } from './helpers/auth';

test.describe('CareerX Multi-User Isolation & Privacy Suite', () => {

  test('1. Seeker B cannot view Seeker A\'s job applications or uploaded resumes', async ({ page }) => {
    // Seeker B logs in
    await loginAsSeeker2(page);

    // Navigate to /applications
    await page.goto('/applications');

    // Seeker B has not applied to anything yet, so no applications or empty state
    // Specifically ensure Seeker A's application data is not leaked
    await expect(page.locator(':has-text("No applications"), table tbody tr, div:has-text("pipeline")').first()).toBeVisible({ timeout: 15000 });
    // Verify Seeker B's applications view does not show Seeker A's private notes
    await expect(page.locator('text=Attached candidate resume')).toHaveCount(0);

    // Navigate to /resume
    await page.goto('/resume');
    // Seeker B has not uploaded any resumes yet
    await expect(page.locator('text=sample_resume.pdf')).toHaveCount(0);
  });

  test('2. Seeker B viewing Seeker A\'s profile cannot edit profile or see sensitive credentials', async ({ page }) => {
    // Seeker B logs in
    await loginAsSeeker2(page);

    // Navigate to Community Feed where Seeker A has published posts
    await page.goto('/feed');
    await expect(page.locator('text=Alice Seeker').first()).toBeVisible({ timeout: 15000 });

    // Click on Seeker A's name to view her public profile
    await page.locator('a:has-text("Alice Seeker")').first().click();

    // Verify Seeker A's public profile is loaded
    await expect(page.locator('h1:has-text("Alice Seeker")').first()).toBeVisible({ timeout: 15000 });

    // Verify "Edit Profile" button is NOT rendered for Seeker B
    await expect(page.locator('button:has-text("Edit Profile")')).toHaveCount(0);

    // Verify sensitive fields like password hashes or private tokens are NOT displayed anywhere in DOM
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('passwordHash');
    expect(bodyText).not.toContain('$2b$12$');
  });

  test('3. Seeker B cannot delete or moderate Seeker A\'s feed posts', async ({ page }) => {
    await loginAsSeeker2(page);

    await page.goto('/feed');
    await expect(page.locator('text=Alice Seeker').first()).toBeVisible({ timeout: 15000 });

    // Locate Seeker A's post
    const alicePost = page.locator('div:has-text("Alice Seeker")').first();
    await expect(alicePost).toBeVisible();

    // Verify that delete button is NOT rendered on Alice's post for Seeker B
    const deleteBtn = alicePost.locator('button[title*="Delete"], button[aria-label*="Delete"], button:has(svg.lucide-trash-2)');
    await expect(deleteBtn).toHaveCount(0);
  });

  test('4. Notifications are isolated per authenticated user session', async ({ page }) => {
    await loginAsSeeker2(page);

    await page.goto('/notifications');

    // Seeker B's notifications list loads without error
    await expect(page.locator('h1:has-text("Notification"), :has-text("Notifications")').first()).toBeVisible({ timeout: 15000 });

    // Any notification in the list must not belong to other users
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('seeker@careerx.com');
  });

  test('5. Recruiter portal isolates candidate applicant records to relevant job listings', async ({ page }) => {
    await loginAsRecruiter(page);

    await page.goto('/recruiter');

    // Verify recruiter only accesses TechNova Solutions candidate workspace
    await expect(page.locator('text=TechNova Solutions').first()).toBeVisible({ timeout: 15000 });

    // Switch to applicant pipeline
    await page.locator('button:has-text("Applicant Pipeline")').first().click();

    // Verify unapplied candidates are not leaked into the pipeline
    await expect(page.locator('text=Charlie Seeker')).toHaveCount(0);
  });

});
