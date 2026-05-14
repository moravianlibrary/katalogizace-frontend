import { expect, test as setup } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { e2eEnv } from './support/env';
import { AUTH_FILE } from './support/paths';

setup('authenticate via login form', async ({ page }) => {
  await fs.mkdir(path.dirname(AUTH_FILE), { recursive: true });

  await page.goto('/login');

  await page.getByTestId('login-email').fill(e2eEnv.email);
  await page.getByTestId('login-password').fill(e2eEnv.password);
  await page.getByTestId('login-submit').click();

  try {
    await expect(page).toHaveURL(/\/batches$/, { timeout: 10_000 });
  } catch (error) {
    const toast = page.getByTestId('toast');
    const toastText = (await toast.isVisible().catch(() => false))
      ? (await page.getByTestId('toast-message').textContent())?.trim()
      : null;

    const suffix = toastText
      ? ` Visible toast: "${toastText}".`
      : ' No toast was visible on the page.';

    throw new Error(
      `Login did not redirect to /batches.${suffix} Check the E2E credentials and the live backend response.`,
      { cause: error },
    );
  }

  await expect(page.getByTestId('batches-page')).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
});
