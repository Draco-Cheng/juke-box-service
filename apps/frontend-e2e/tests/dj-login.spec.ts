import { test, expect } from '@playwright/test';

test.describe('DJ Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dj');
  });

  test('should display login form', async ({ page }) => {
    // Check heading
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'DJ Login'
    );

    // Check mode toggle tabs
    await expect(page.getByRole('button', { name: 'Password' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Magic Link' })
    ).toBeVisible();

    // Check form elements
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

    // Check registration link
    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();

    // Check back link
    await expect(page.getByText(/Back to DropBeat/)).toBeVisible();
  });

  test('should require email and password fields', async ({ page }) => {
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toHaveAttribute('required');
    await expect(emailInput).toHaveAttribute('type', 'email');

    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should disable login button when fields are empty', async ({
    page,
  }) => {
    // Button should be disabled initially (no email/password)
    const loginButton = page.getByRole('button', { name: 'Login' });
    await expect(loginButton).toBeDisabled();

    // Fill only email — still disabled
    await page.getByLabel('Email').fill('test@test.com');
    await expect(loginButton).toBeDisabled();

    // Fill password too — should be enabled
    await page.getByLabel('Password').fill('password123');
    await expect(loginButton).toBeEnabled({ timeout: 3000 });
  });

  test('should switch to magic link mode', async ({ page }) => {
    // Click Magic Link tab
    await page.getByRole('button', { name: 'Magic Link' }).click();

    // Password field should be hidden
    await expect(page.getByLabel('Password')).not.toBeVisible();

    // Should show Send Magic Link button
    await expect(
      page.getByRole('button', { name: 'Send Magic Link' })
    ).toBeVisible();

    // Should show hint text
    await expect(
      page.getByText(/send you an email with a link to sign in/)
    ).toBeVisible();
  });
});

// Tests that need Supabase mocking must set up routes BEFORE navigation
test.describe('DJ Login Page - Auth Interactions', () => {
  test('should show error message for invalid credentials', async ({
    page,
  }) => {
    // Set up route mock BEFORE navigating
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        }),
      });
    });

    await page.goto('/dj');

    // Fill in credentials
    await page.getByLabel('Email').fill('nonexistent@test.com');
    await page.getByLabel('Password').fill('wrongpassword');

    // Submit form
    await page.getByRole('button', { name: 'Login' }).click();

    // Check for error message
    await expect(page.getByText('Invalid email or password')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show loading state when logging in', async ({ page }) => {
    // Set up route mock BEFORE navigating — delay response to observe loading
    await page.route('**/auth/v1/token*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        }),
      });
    });

    await page.goto('/dj');

    // Fill in credentials
    await page.getByLabel('Email').fill('test@test.com');
    await page.getByLabel('Password').fill('testpassword');

    // Submit form
    await page.getByRole('button', { name: 'Login' }).click();

    // Button should show loading text
    await expect(
      page.getByRole('button', { name: 'Logging in...' })
    ).toBeVisible();

    // Should stay on /dj
    await expect(page).toHaveURL(/\/dj/);
  });

  test('should show magic link sent confirmation', async ({ page }) => {
    // Set up route mock BEFORE navigating
    await page.route('**/auth/v1/otp*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.goto('/dj');

    // Switch to magic link mode
    await page.getByRole('button', { name: 'Magic Link' }).click();

    // Fill email
    await page.getByLabel('Email').fill('test@dj.com');

    // Send magic link
    await page.getByRole('button', { name: 'Send Magic Link' }).click();

    // Should show confirmation
    await expect(page.getByText('Check your email!')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/sent a login link to/)).toBeVisible();
    await expect(page.getByText('test@dj.com')).toBeVisible();

    // Should show try different email button
    await expect(page.getByText('Try a different email')).toBeVisible();
  });
});
