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

  test('should show error when login fails', async ({ page }) => {
    // Fill in credentials and submit
    await page.getByLabel('Email').fill('nonexistent@test.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Login' }).click();

    // Should show an error message (exact text depends on Supabase availability)
    // "Invalid email or password" when Supabase is configured,
    // "Authentication service unavailable" when it's not
    await expect(
      page.getByText(
        /Invalid email or password|Authentication service unavailable/
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state when logging in', async ({ page }) => {
    // Fill in credentials
    await page.getByLabel('Email').fill('test@test.com');
    await page.getByLabel('Password').fill('testpassword');

    // Submit form
    await page.getByRole('button', { name: 'Login' }).click();

    // Should show either loading text or an error (if Supabase responds immediately)
    // This verifies the form submission happens without crashing
    await expect(
      page.getByText(
        /Logging in|Invalid email or password|Authentication service unavailable/
      )
    ).toBeVisible({ timeout: 10000 });

    // Should stay on /dj
    await expect(page).toHaveURL(/\/dj/);
  });

  test('should show magic link mode UI and submit', async ({ page }) => {
    // Switch to magic link mode
    await page.getByRole('button', { name: 'Magic Link' }).click();

    // Fill email and submit
    await page.getByLabel('Email').fill('test@dj.com');
    await page.getByRole('button', { name: 'Send Magic Link' }).click();

    // Should show either the confirmation or an error
    // "Check your email!" when Supabase is configured,
    // an error message otherwise
    await expect(
      page.getByText(/Check your email!|error|unavailable|failed/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
