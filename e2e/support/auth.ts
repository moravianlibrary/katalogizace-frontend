import { expect, Page, test } from '@playwright/test';

export type AccountCredentials = {
  email: string;
  password: string;
};

export async function loginWithCredentials(
  page: Page,
  credentials: AccountCredentials,
): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(credentials.email);
  await page.getByTestId('login-password').fill(credentials.password);
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/batches$/, { timeout: 10_000 });
  await expect(page.getByTestId('batches-page')).toBeVisible();
}

export function skipIfCredentialsMissing(
  credentials: { configured: boolean },
  reason: string,
): void {
  test.skip(!credentials.configured, reason);
}
