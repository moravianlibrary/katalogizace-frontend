import { expect, test } from '@playwright/test';
import { AppApiClient, SmokeScenario } from './support/api-client';
import { waitForQueryParam } from './support/ui-helpers';

test.describe('books list filters', () => {
  let scenario: SmokeScenario;

  test.beforeAll(async ({ playwright }) => {
    const api = await AppApiClient.create(playwright);
    scenario = await api.resolveFixtureSmokeScenario();
    await api.dispose();
  });

  test('syncs process and record state filters to URL and keeps the matching book visible', async ({
    page,
  }) => {
    await page.goto(`/batches/${scenario.batchId}/books`);

    await expect(page.getByTestId('books-page')).toBeVisible();

    await page.getByTestId('books-process-state-filter').click();
    await page
      .getByTestId('books-process-state-filter-option-completed')
      .click();

    await waitForQueryParam(
      page,
      'process_state',
      'completed',
      'Expected the process-state filter to be synchronized to URL',
    );

    const bookRow = page.getByTestId(`book-row-${scenario.bookId}`);
    await expect(bookRow).toBeVisible();

    await page.getByTestId('books-record-state-filter').click();
    await page
      .getByTestId(
        `books-record-state-filter-option-${scenario.bookRecordState}`,
      )
      .click();

    await waitForQueryParam(
      page,
      'record_state',
      scenario.bookRecordState,
      'Expected the record-state filter to be synchronized to URL',
    );

    await expect(bookRow).toBeVisible();
  });
});
