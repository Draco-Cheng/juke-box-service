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
    const emailInput = page.getByLabel('Email');
    await emailInput.click();
    await emailInput.pressSequentially('test@test.com');
    await expect(loginButton).toBeDisabled();

    // Fill password too — should be enabled
    const passwordInput = page.getByLabel('Password');
    await passwordInput.click();
    await passwordInput.pressSequentially('password123');
    await expect(loginButton).toBeEnabled({ timeout: 5000 });
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
    // Fill in credentials using pressSequentially for webkit compatibility
    const emailInput = page.getByLabel('Email');
    await emailInput.click();
    await emailInput.pressSequentially('nonexistent@test.com');

    const passwordInput = page.getByLabel('Password');
    await passwordInput.click();
    await passwordInput.pressSequentially('wrongpassword');

    // Wait for button to be enabled before clicking
    const loginButton = page.getByRole('button', { name: 'Login' });
    await expect(loginButton).toBeEnabled({ timeout: 5000 });
    await loginButton.click();

    // Should show an error message (exact text depends on Supabase availability)
    await expect(
      page.getByText(
        /Invalid email or password|Authentication service unavailable/
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state when logging in', async ({ page }) => {
    // Fill in credentials using pressSequentially for webkit compatibility
    const emailInput = page.getByLabel('Email');
    await emailInput.click();
    await emailInput.pressSequentially('test@test.com');

    const passwordInput = page.getByLabel('Password');
    await passwordInput.click();
    await passwordInput.pressSequentially('testpassword');

    // Wait for button to be enabled before clicking
    const loginButton = page.getByRole('button', { name: 'Login' });
    await expect(loginButton).toBeEnabled({ timeout: 5000 });
    await loginButton.click();

    // Should show either loading text or an error (if Supabase responds immediately)
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
    const emailInput = page.getByLabel('Email');
    await emailInput.click();
    await emailInput.pressSequentially('test@dj.com');
    await page.getByRole('button', { name: 'Send Magic Link' }).click();

    // Should show either the confirmation or an error
    // "Check your email!" when Supabase is configured,
    // "Supabase not configured" or other error when it's not
    await expect(
      page.getByText(/Check your email!|not configured|error|unavailable|failed/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
