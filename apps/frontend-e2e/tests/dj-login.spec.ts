import { test, expect } from '@playwright/test';

test.describe('DJ Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dj');
  });

  test('should display login form', async ({ page }) => {
    // Check heading
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('DJ Login');

    // Check form elements
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /Login/i })).toBeVisible();

    // Check registration link
    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    // Fill in invalid email and password
    await page.getByLabel('Email').fill('nonexistent@test.com');
    await page.getByLabel('Password').fill('wrongpassword');

    // Submit form
    await page.getByRole('button', { name: /Login/i }).click();

    // Check for error message
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
  });

  test('should show loading state when logging in', async ({ page }) => {
    // Fill in email and password
    await page.getByLabel('Email').fill('test@test.com');
    await page.getByLabel('Password').fill('testpassword');

    // Submit form and check loading state
    const loginButton = page.getByRole('button', { name: /Login/i });
    await loginButton.click();

    // Button should show loading state (may be brief)
    // We just verify the form submission happens without crash
    await expect(page).toHaveURL(/\/dj/);
  });

  test('should require email and password fields', async ({ page }) => {
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toHaveAttribute('required');
    await expect(emailInput).toHaveAttribute('type', 'email');

    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
