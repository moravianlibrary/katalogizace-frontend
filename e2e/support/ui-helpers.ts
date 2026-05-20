import { expect, Locator, Page } from '@playwright/test';
import type { SmokeScenario } from './api-client';

export async function waitForQueryParam(
  page: Page,
  key: string,
  expectedValue: string,
  message: string,
): Promise<void> {
  await expect
    .poll(() => new URL(page.url()).searchParams.get(key), {
      timeout: 10_000,
      message,
    })
    .toBe(expectedValue);
}

export async function openScenarioBookDetail(
  page: Page,
  scenario: SmokeScenario,
): Promise<void> {
  await page.goto(`/batches/${scenario.batchId}/books`);
  await expect(page.getByTestId('books-page')).toBeVisible();

  await page
    .getByTestId('books-search')
    .locator('input')
    .fill(scenario.bookSearchQuery);

  await waitForQueryParam(
    page,
    'search',
    scenario.bookSearchQuery,
    'Expected the book search query to be synchronized to URL',
  );

  const bookRow = page.getByTestId(`book-row-${scenario.bookId}`);
  await expect(bookRow).toBeVisible();
  await bookRow.click();

  await expect(page).toHaveURL(
    new RegExp(`/batches/${scenario.batchId}/books/${scenario.bookId}$`),
  );
  await expect(page.getByTestId('gallery-panel')).toBeVisible();
  await expect(page.getByTestId('main-panel')).toBeVisible();
}

export async function openBookDetailByIds(
  page: Page,
  batchId: number,
  bookId: number,
): Promise<void> {
  await page.goto(`/batches/${batchId}/books/${bookId}`);
  await expect(page.getByTestId('gallery-panel')).toBeVisible();
  await expect(page.getByTestId('main-panel')).toBeVisible();
}

export async function openFieldEditorByTag(
  page: Page,
  fieldTag: string,
): Promise<Locator> {
  const row = page
    .locator(
      `[data-testid="editable-record-row"][data-field-tag="${fieldTag}"]`,
    )
    .first();

  await expect(row).toBeVisible();
  await row.click();

  const contextPanel = page.getByTestId('context-panel');
  await expect(contextPanel).toHaveAttribute('data-mode', 'edit');

  const fieldEditor = page.getByTestId('field-editor');
  await expect(fieldEditor).toBeVisible();

  return fieldEditor;
}

export async function getPrimaryFieldEditorInput(
  fieldEditor: Locator,
): Promise<Locator> {
  const textareas = fieldEditor.getByTestId('autocomplete-textarea');
  if ((await textareas.count()) > 0) {
    return textareas.first();
  }

  return fieldEditor.getByTestId('autocomplete-input').first();
}

export async function collectEditableRowTexts(page: Page): Promise<string[]> {
  return page
    .getByTestId('editable-record-row')
    .evaluateAll((elements) =>
      elements.map((element) =>
        (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
      ),
    );
}

export async function waitForEditableRecordRows(page: Page): Promise<void> {
  const editableRows = page.getByTestId('editable-record-row');

  await expect
    .poll(async () => await editableRows.count(), {
      timeout: 10_000,
      message: 'Expected the main panel MARC rows to finish rendering',
    })
    .toBeGreaterThan(0);
}

export async function extractBookRowIds(page: Page): Promise<number[]> {
  return page.locator('[data-testid^="book-row-"]').evaluateAll((elements) =>
    elements
      .map((element) => {
        const value = element.getAttribute('data-testid') ?? '';
        const match = value.match(/^book-row-(\d+)$/);
        return match ? Number(match[1]) : null;
      })
      .filter((value): value is number => value !== null),
  );
}
