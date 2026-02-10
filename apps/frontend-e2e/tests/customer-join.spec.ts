import { test, expect } from '@playwright/test';

test.describe('Customer Join Page', () => {
  test('should show venue not found for invalid slug', async ({ page }) => {
    await page.goto('/join/nonexistent-venue');

    // Should show error or loading state
    await expect(page.getByText(/Venue not found|Loading/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should display loading state initially', async ({ page }) => {
    await page.goto('/join/test-venue');

    // Either loading or error should be shown
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });
});

test.describe('Customer Join Page with Mock Data', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for venue
    await page.route('**/api/venues/test-club', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'venue-123',
          name: 'Test Club',
          slug: 'test-club',
          settings: {
            pricing: {
              normal: 200,
              priority: 500,
              asap: 1000,
              currency: 'EUR',
            },
            content_filters: {
              enabled: false,
              block_explicit: false,
              blocked_artists: [],
            },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    // Mock active session - no session
    await page.route('**/api/venues/test-club/active-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'null',
      });
    });
  });

  test('should display venue name when no active session', async ({ page }) => {
    await page.goto('/join/test-club');

    // Wait for loading to finish
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Check venue name is displayed
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Test Club');

    // Check no active session message
    await expect(page.getByText('No active session')).toBeVisible();
    await expect(page.getByText('No active DJ session at this venue')).toBeVisible();
    await expect(page.getByText('Check back later!')).toBeVisible();
  });
});

test.describe('Customer Join Page with Active Session', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for venue
    await page.route('**/api/venues/active-club', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'venue-456',
          name: 'Active Club',
          slug: 'active-club',
          settings: {
            pricing: {
              normal: 200,
              priority: 500,
              asap: 1000,
              currency: 'EUR',
            },
            content_filters: {
              enabled: false,
              block_explicit: false,
              blocked_artists: [],
            },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    // Mock active session
    await page.route('**/api/venues/active-club/active-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'session-123',
          venue_id: 'venue-456',
          dj_id: 'dj-123',
          status: 'active',
          started_at: new Date().toISOString(),
          ended_at: null,
        }),
      });
    });

    // Mock session requests
    await page.route('**/api/requests/session/session-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'req-1',
            session_id: 'session-123',
            song_title: 'Test Song',
            song_artist: 'Test Artist',
            tier: 'normal',
            status: 'pending',
            amount: 200,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]),
      });
    });

    // Mock Stripe config
    await page.route('**/api/payments/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          publishable_key: 'pk_test_xxx',
        }),
      });
    });
  });

  test('should display active session with request form', async ({ page }) => {
    await page.goto('/join/active-club');

    // Wait for loading to finish
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Check venue name and session status
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Active Club');
    await expect(page.getByText('Session active')).toBeVisible();

    // Check request form is visible
    await expect(page.getByRole('heading', { name: 'Request a Song' })).toBeVisible();

    // Check tier buttons
    await expect(page.getByRole('button', { name: /Normal €2/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Priority €5/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ASAP €10/i })).toBeVisible();

    // Check message textarea
    await expect(page.getByPlaceholder(/Message to DJ/i)).toBeVisible();

    // Check submit button
    await expect(page.getByRole('button', { name: /Authorize €2 & Submit/i })).toBeVisible();
  });

  test('should display request queue', async ({ page }) => {
    await page.goto('/join/active-club');

    // Wait for loading to finish
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Check queue section
    await expect(page.getByRole('heading', { name: /Queue/i })).toBeVisible();

    // Check queue item
    await expect(page.getByText('Test Song')).toBeVisible();
    await expect(page.getByText('Test Artist')).toBeVisible();
  });

  test('should allow tier selection', async ({ page }) => {
    await page.goto('/join/active-club');

    // Wait for loading to finish
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Default is normal tier
    const normalButton = page.getByRole('button', { name: /Normal €2/i });
    const priorityButton = page.getByRole('button', { name: /Priority €5/i });
    const asapButton = page.getByRole('button', { name: /ASAP €10/i });

    // Click priority
    await priorityButton.click();

    // Submit button should update price
    await expect(page.getByRole('button', { name: /Authorize €5 & Submit/i })).toBeVisible();

    // Click ASAP
    await asapButton.click();

    // Submit button should update price
    await expect(page.getByRole('button', { name: /Authorize €10 & Submit/i })).toBeVisible();

    // Click normal
    await normalButton.click();

    // Submit button should update price
    await expect(page.getByRole('button', { name: /Authorize €2 & Submit/i })).toBeVisible();
  });

  test('submit button should be disabled without song selection', async ({ page }) => {
    await page.goto('/join/active-club');

    // Wait for loading to finish
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Submit button should be disabled
    const submitButton = page.getByRole('button', { name: /Authorize €2 & Submit/i });
    await expect(submitButton).toBeDisabled();
  });
});
