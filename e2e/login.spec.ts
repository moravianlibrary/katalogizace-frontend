import { expect, test } from '@playwright/test';
import { e2eEnv } from './support/env';

test.use({ storageState: { cookies: [], origins: [] } });

test('redirects unauthenticated user to login and allows sign-in', async ({
  page,
}) => {
  await page.goto('/batches');

  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fbatches$/);
  await expect(page.getByTestId('login-page')).toBeVisible();

  await page.getByTestId('login-email').fill(e2eEnv.email);
  await page.getByTestId('login-password').fill(e2eEnv.password);
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/batches$/);
  await expect(page.getByTestId('batches-page')).toBeVisible();
});
