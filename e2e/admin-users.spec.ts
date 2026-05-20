import { expect, test } from '@playwright/test';
import { AppApiClient } from './support/api-client';
import { loginWithCredentials, skipIfCredentialsMissing } from './support/auth';
import { e2eEnv } from './support/env';

test.describe.serial('admin user management flows', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('admin can search, create, edit, and reset a user password', async ({
    page,
    playwright,
  }) => {
    skipIfCredentialsMissing(
      e2eEnv.admin,
      'Admin credentials are not configured in .env.e2e.',
    );

    const adminCredentials = {
      email: e2eEnv.admin.email!,
      password: e2eEnv.admin.password!,
    };

    const api = await AppApiClient.create(playwright, adminCredentials);
    let createdUserId: number | null = null;

    try {
      const currentAdmin = await api.getCurrentUser();

      await loginWithCredentials(page, adminCredentials);
      await page.goto('/users');

      await expect(page.getByTestId('users-page')).toBeVisible();

      await page
        .getByTestId('users-search')
        .locator('input')
        .fill(currentAdmin.email);
      await expect(
        page.getByTestId(`user-row-${currentAdmin.id}`),
      ).toBeVisible();

      const uniqueSuffix = Date.now();
      const createdFullName = `Playwright User ${uniqueSuffix}`;
      const updatedFullName = `Playwright User Updated ${uniqueSuffix}`;
      const createdEmail = `playwright.user.${uniqueSuffix}@example.com`;

      await page.getByTestId('create-user-button').click();
      await expect(page.getByTestId('create-user-dialog')).toBeVisible();

      await page.getByTestId('user-full-name').fill(createdFullName);
      await page.getByTestId('user-email').fill(createdEmail);
      await page.getByTestId('create-user-submit').click();

      const generatedPasswordDialog = page.getByTestId(
        'generated-password-dialog',
      );
      await expect(generatedPasswordDialog).toBeVisible();
      await expect(
        page.getByTestId('generated-password-input'),
      ).not.toHaveValue('');
      await page.getByTestId('generated-password-close').click();

      await expect
        .poll(
          async () =>
            (await api.findUserByEmail(createdEmail, { forceRefresh: true }))
              ?.id ?? null,
          {
            timeout: 10_000,
            message: 'Expected the newly created user to exist in the backend',
          },
        )
        .not.toBeNull();

      createdUserId = (await api.findUserByEmail(createdEmail, {
        forceRefresh: true,
      }))!.id;

      await page
        .getByTestId('users-search')
        .locator('input')
        .fill(createdEmail);
      const createdUserRow = page.getByTestId(`user-row-${createdUserId}`);
      await expect(createdUserRow).toBeVisible();

      await page.getByTestId(`edit-user-${createdUserId}`).click();
      await expect(page.getByTestId('edit-user-dialog')).toBeVisible();

      await page.getByTestId('user-full-name').fill(updatedFullName);
      await page.getByTestId('edit-user-submit').click();

      await expect(page.getByTestId('toast')).toBeVisible();
      await expect(createdUserRow).toContainText(updatedFullName);

      await page.getByTestId(`edit-user-${createdUserId}`).click();
      await expect(page.getByTestId('edit-user-dialog')).toBeVisible();

      await page.getByTestId('user-reset-password').click();
      await expect(generatedPasswordDialog).toBeVisible();
      await expect(
        page.getByTestId('generated-password-input'),
      ).not.toHaveValue('');
      await page.getByTestId('generated-password-close').click();
    } finally {
      if (createdUserId !== null) {
        await api.deleteUser(createdUserId);
      }

      await api.dispose();
    }
  });
});
