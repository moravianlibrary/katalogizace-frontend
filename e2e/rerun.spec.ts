import { expect, test } from '@playwright/test';
import { e2eEnv } from './support/env';

test.describe('rerun workflow', () => {
  test('restarts processing for a fixture book when opt-in flag is enabled', async ({
    page,
  }) => {
    test.skip(
      !e2eEnv.enableRerunMutation,
      'Rerun is an opt-in live-backend mutation. Set E2E_ENABLE_RERUN_MUTATION=true to execute it.',
    );

    const rerunBookId =
      e2eEnv.fixtures.bookIds[1] ?? e2eEnv.fixtures.bookIds[0];

    await page.goto(`/batches/${e2eEnv.fixtures.batchId}/books`);
    await expect(page.getByTestId('books-page')).toBeVisible();

    const rerunButton = page.getByTestId(`rerun-book-${rerunBookId}`);
    await expect(rerunButton).toBeVisible();
    await expect(rerunButton).toBeEnabled();

    await rerunButton.click();
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await page.getByTestId('confirm-dialog-confirm').click();

    await expect(page.getByTestId('toast')).toBeVisible();
    await expect(rerunButton).toBeDisabled({ timeout: 15_000 });
  });
});
