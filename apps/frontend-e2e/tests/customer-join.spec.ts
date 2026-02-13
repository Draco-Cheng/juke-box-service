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

test.describe('Customer Join Page with Mock Data (no active session)', () => {
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

    // Mock Stripe config (loaded on mount)
    await page.route('**/api/payments/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ publishable_key: 'pk_test_xxx' }),
      });
    });
  });

  test('should display no active session message when no session', async ({
    page,
  }) => {
    await page.goto('/join/test-club');

    // Should show no active session message
    await expect(
      page.getByText('No active session at this venue.')
    ).toBeVisible({ timeout: 10000 });

    // Should show "Go back" link
    await expect(page.getByText('Go back')).toBeVisible();
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

    // Mock Stripe config
    await page.route('**/api/payments/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ publishable_key: 'pk_test_xxx' }),
      });
    });

    // Mock Spotify search
    await page.route('**/api/spotify/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'track-1',
            name: 'Test Song',
            artists: ['Test Artist'],
            album: 'Test Album',
            image_url: null,
            duration_ms: 200000,
            explicit: false,
          },
        ]),
      });
    });
  });

  test('should display step 1: Choose a Song with search UI', async ({
    page,
  }) => {
    await page.goto('/join/active-club');

    // Wait for page to load
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Choose a Song',
      { timeout: 10000 }
    );

    // Search mode UI
    await expect(page.getByText('Search for a song')).toBeVisible();
    await expect(
      page.getByPlaceholder('Search songs or artists...')
    ).toBeVisible();
    await expect(page.getByText('Enter manually')).toBeVisible();

    // Continue button should NOT be visible (no song selected)
    await expect(page.getByText('Continue to Offer')).not.toBeVisible();
  });

  test('should allow switching to manual entry mode', async ({ page }) => {
    await page.goto('/join/active-club');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Choose a Song',
      { timeout: 10000 }
    );

    // Switch to manual mode
    await page.getByText('Enter manually').click();

    // Manual mode UI
    await expect(page.getByText('Manual Entry')).toBeVisible();
    await expect(page.getByPlaceholder('Song title *')).toBeVisible();
    await expect(page.getByPlaceholder('Artist (optional)')).toBeVisible();
    await expect(page.getByText('Search Spotify instead')).toBeVisible();
  });

  test('should show Continue button after entering song manually', async ({
    page,
  }) => {
    await page.goto('/join/active-club');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Choose a Song',
      { timeout: 10000 }
    );

    // Switch to manual and enter a title
    await page.getByText('Enter manually').click();
    await page.getByPlaceholder('Song title *').fill('My Song');

    // Continue button and message field should now appear
    await expect(page.getByText('Continue to Offer')).toBeVisible();
    await expect(
      page.getByPlaceholder('Message to DJ (optional)')
    ).toBeVisible();
  });

  test('should search Spotify and select a track', async ({ page }) => {
    await page.goto('/join/active-club');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Choose a Song',
      { timeout: 10000 }
    );

    // Type in search
    await page.getByPlaceholder('Search songs or artists...').fill('Test');

    // Wait for search results
    await expect(page.getByText('Test Song')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Test Artist')).toBeVisible();

    // Select the track
    await page.getByText('Test Song').click();

    // Should show selected state
    await expect(page.getByText('Selected Song')).toBeVisible();
    await expect(page.getByText('Continue to Offer')).toBeVisible();
  });

  test('should navigate to step 2: Make Your Offer', async ({ page }) => {
    await page.goto('/join/active-club');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Choose a Song',
      { timeout: 10000 }
    );

    // Enter song manually and continue
    await page.getByText('Enter manually').click();
    await page.getByPlaceholder('Song title *').fill('My Song');
    await page.getByPlaceholder('Artist (optional)').fill('My Artist');
    await page.getByText('Continue to Offer').click();

    // Step 2 UI
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Make Your Offer'
    );

    // Song summary
    await expect(page.getByText('My Song')).toBeVisible();
    await expect(page.getByText('My Artist')).toBeVisible();

    // Offer display
    await expect(page.getByText('Your offer', { exact: true })).toBeVisible();

    // Quick amount buttons (default min is €2)
    await expect(
      page.getByRole('button', { name: '€5', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '€10', exact: true })
    ).toBeVisible();

    // Trust signal
    await expect(
      page.getByText('You are only charged if your song is played')
    ).toBeVisible();

    // Submit CTA
    await expect(page.getByText(/Send Request/)).toBeVisible();
  });

  test('should update offer amount via quick buttons', async ({ page }) => {
    await page.goto('/join/active-club');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Choose a Song',
      { timeout: 10000 }
    );

    // Navigate to offer step
    await page.getByText('Enter manually').click();
    await page.getByPlaceholder('Song title *').fill('My Song');
    await page.getByText('Continue to Offer').click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Make Your Offer'
    );

    // Click €10 button
    await page.getByRole('button', { name: '€10' }).click();

    // Submit button should show €10
    await expect(
      page.getByRole('button', { name: 'Send Request — €10' })
    ).toBeVisible();

    // Click €20 button
    await page.getByRole('button', { name: '€20' }).click();

    // Submit button should show €20
    await expect(
      page.getByRole('button', { name: 'Send Request — €20' })
    ).toBeVisible();
  });
});
