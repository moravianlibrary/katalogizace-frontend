import { expect, test } from '@playwright/test';
import { loginWithCredentials, skipIfCredentialsMissing } from './support/auth';
import { e2eEnv } from './support/env';

test.describe('forbidden access flows', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('limited user is redirected to the forbidden page when opening users administration', async ({
    page,
  }) => {
    skipIfCredentialsMissing(
      e2eEnv.limited,
      'Limited user credentials are not configured in .env.e2e.',
    );

    await loginWithCredentials(page, {
      email: e2eEnv.limited.email!,
      password: e2eEnv.limited.password!,
    });

    await page.goto('/users');

    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(page.getByTestId('forbidden-page')).toBeVisible();
  });
});
