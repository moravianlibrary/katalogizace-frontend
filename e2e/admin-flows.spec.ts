import { expect, test } from '@playwright/test';
import { AppApiClient } from './support/api-client';
import { e2eEnv } from './support/env';

test.describe.serial('admin and batch flows', () => {
  let api: AppApiClient;

  test.beforeAll(async ({ playwright }) => {
    api = await AppApiClient.create(playwright);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('edits the fixture batch description and restores it through API cleanup', async ({
    page,
  }) => {
    const originalBatch = await api.getBatch(e2eEnv.fixtures.batchId);
    const updatedDescription = `Playwright edited ${Date.now()}`;

    try {
      await page.goto('/batches');
      await expect(page.getByTestId('batches-page')).toBeVisible();

      const batchRow = page.getByTestId(`batch-row-${e2eEnv.fixtures.batchId}`);
      await expect(batchRow).toBeVisible();
      await page.getByTestId(`edit-batch-${e2eEnv.fixtures.batchId}`).click();

      await expect(page.getByTestId('edit-batch-dialog')).toBeVisible();
      await page.getByTestId('edit-batch-description').fill(updatedDescription);
      await page.getByTestId('edit-batch-submit').click();

      await expect(page.getByTestId('toast')).toBeVisible();
      await expect(batchRow).toContainText(updatedDescription);
    } finally {
      await api.updateBatch(e2eEnv.fixtures.batchId, {
        name: originalBatch.name,
        description: originalBatch.description,
        state: originalBatch.state,
      });
    }
  });

  test('creates a batch and opens its books page', async ({ page }) => {
    const uniqueSuffix = Date.now();
    const batchName = `Playwright batch ${uniqueSuffix}`;
    const batchDescription = `Temporary E2E batch ${uniqueSuffix}`;
    let createdBatchId: number | null = null;

    try {
      await page.goto('/batches');
      await expect(page.getByTestId('batches-page')).toBeVisible();

      await page.getByTestId('create-batch-button').click();
      await expect(page.getByTestId('create-batch-dialog')).toBeVisible();

      await page.getByTestId('create-batch-name').fill(batchName);
      await page.getByTestId('create-batch-description').fill(batchDescription);
      await page.getByTestId('create-batch-submit').click();

      await expect(page).toHaveURL(/\/batches\/\d+\/books$/);
      await expect(page.getByTestId('books-page')).toBeVisible();

      const match = page.url().match(/\/batches\/(\d+)\/books$/);
      createdBatchId = match ? Number(match[1]) : null;

      expect(createdBatchId).not.toBeNull();
    } finally {
      if (createdBatchId !== null) {
        await api.deleteBatch(createdBatchId);
      }
    }
  });
});
