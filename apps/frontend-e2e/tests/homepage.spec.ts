import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display welcome message and DJ login link', async ({ page }) => {
    await page.goto('/');

    // Check heading
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('DJ Request');

    // Check tagline
    await expect(page.getByText('Pay to request songs from DJs')).toBeVisible();

    // Check DJ login link
    const djLoginLink = page.getByRole('link', { name: /DJ Login/i });
    await expect(djLoginLink).toBeVisible();
    await expect(djLoginLink).toHaveAttribute('href', '/dj');
  });

  test('should navigate to DJ login page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /DJ Login/i }).click();

    await expect(page).toHaveURL('/dj');
  });
});
