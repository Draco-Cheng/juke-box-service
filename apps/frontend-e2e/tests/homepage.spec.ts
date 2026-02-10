import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display welcome message and DJ login link', async ({ page }) => {
    await page.goto('/');

    // Check heading (DropBeat with split styling)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('DropBeat');

    // Check tagline
    await expect(
      page.getByText('Request songs from live DJs. Your song, your moment.')
    ).toBeVisible();

    // Check DJ Mode tab button
    const djModeButton = page.getByRole('button', { name: /DJ Mode/i });
    await expect(djModeButton).toBeVisible();
  });

  test('should navigate to DJ login page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /DJ Mode/i }).click();

    await expect(page).toHaveURL('/dj');
  });
});
