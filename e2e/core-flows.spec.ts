import { expect, test } from '@playwright/test';
import { AppApiClient, SmokeScenario } from './support/api-client';

test.describe('core live-backend smoke flows', () => {
  let scenario: SmokeScenario;

  test.beforeAll(async ({ playwright }) => {
    const api = await AppApiClient.create(playwright);
    scenario = await api.resolveFixtureSmokeScenario();
    await api.dispose();
  });

  test('supports batch search and opens the matching books list', async ({
    page,
  }) => {
    await page.goto('/batches');

    await expect(page.getByTestId('batches-page')).toBeVisible();

    const searchInput = page.locator('[data-testid="batches-search"] input');
    await searchInput.fill(scenario.batchSearchQuery);

    await expect
      .poll(() => new URL(page.url()).searchParams.get('search'), {
        message: 'Expected the batch search query to be synchronized to URL',
        timeout: 10_000,
      })
      .toBe(scenario.batchSearchQuery);

    const batchRow = page.getByTestId(`batch-row-${scenario.batchId}`);
    await expect(batchRow).toBeVisible();

    await batchRow.click();

    await expect(page).toHaveURL(
      new RegExp(`/batches/${scenario.batchId}/books(?:\\?.*)?$`),
    );
    await expect(page.getByTestId('books-page')).toBeVisible();
    await expect(page.getByTestId(`book-row-${scenario.bookId}`)).toBeVisible();
  });

  test('opens a completed book, enters field edit mode, and exports MARCXML', async ({
    page,
  }) => {
    await page.goto(`/batches/${scenario.batchId}/books`);

    await expect(page.getByTestId('books-page')).toBeVisible();

    const searchInput = page.locator('[data-testid="books-search"] input');
    await searchInput.fill(scenario.bookSearchQuery);

    await expect
      .poll(() => new URL(page.url()).searchParams.get('search'), {
        message: 'Expected the book search query to be synchronized to URL',
        timeout: 10_000,
      })
      .toBe(scenario.bookSearchQuery);

    const bookRow = page.getByTestId(`book-row-${scenario.bookId}`);
    await expect(bookRow).toBeVisible();

    await bookRow.click();

    await expect(page).toHaveURL(
      new RegExp(
        `/batches/${scenario.batchId}/books/${scenario.bookId}(?:\\?.*)?$`,
      ),
    );
    await expect(page.getByTestId('gallery-panel')).toBeVisible();
    await expect(page.getByTestId('main-panel')).toBeVisible();

    const contextPanel = page.getByTestId('context-panel');
    await expect(contextPanel).toHaveAttribute('data-mode', 'records');

    const editableFieldRow = page
      .locator(
        `[data-testid="editable-record-row"][data-field-tag="${scenario.editableFieldTag}"]`,
      )
      .first();

    await expect(editableFieldRow).toBeVisible();
    await editableFieldRow.click();

    await expect(contextPanel).toHaveAttribute('data-mode', 'edit');
    await expect(page.getByTestId('field-editor')).toBeVisible();

    await page.getByTestId('export-record-button').click();

    const exportDialog = page.getByTestId('export-marcxml-dialog');
    await expect(exportDialog).toBeVisible();
    await expect(page.getByTestId('export-marcxml-textarea')).toHaveValue(
      /<record xmlns="http:\/\/www\.loc\.gov\/MARC21\/slim">/,
    );
  });
});
