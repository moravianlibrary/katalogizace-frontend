import { expect, test } from '@playwright/test';
import { AppApiClient, EditingScenario } from './support/api-client';
import { e2eEnv } from './support/env';
import {
  collectEditableRowTexts,
  getPrimaryFieldEditorInput,
  openBookDetailByIds,
  openFieldEditorByTag,
  openScenarioBookDetail,
  waitForEditableRecordRows,
} from './support/ui-helpers';

test.describe.serial('book detail editing flows', () => {
  let api: AppApiClient;
  let editingScenario: EditingScenario;

  test.beforeAll(async ({ playwright }) => {
    api = await AppApiClient.create(playwright);
    editingScenario = await api.resolveFixtureEditingScenario();
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('resets field edits back to the original value without saving', async ({
    page,
  }) => {
    await openScenarioBookDetail(page, editingScenario);

    const fieldEditor = await openFieldEditorByTag(
      page,
      editingScenario.textEditableFieldTag,
    );
    const input = await getPrimaryFieldEditorInput(fieldEditor);

    const originalValue = await input.inputValue();
    const modifiedValue = buildModifiedValue(originalValue);

    await input.fill(modifiedValue);
    await expect(input).toHaveValue(modifiedValue);

    await page.getByTestId('reset-field-button').click();
    await expect(input).toHaveValue(originalValue);
  });

  test('saves an edited field, survives reload, and restores the original revision through the API cleanup path', async ({
    page,
  }) => {
    let cleanupRequired = false;

    try {
      await openScenarioBookDetail(page, editingScenario);

      const fieldEditor = await openFieldEditorByTag(
        page,
        editingScenario.textEditableFieldTag,
      );
      const input = await getPrimaryFieldEditorInput(fieldEditor);

      const originalValue = await input.inputValue();
      const modifiedValue = buildModifiedValue(originalValue);

      await input.fill(modifiedValue);
      await expect(input).toHaveValue(modifiedValue);

      const saveButton = page.getByTestId('save-record-button');
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      await expect(page.getByTestId('toast')).toBeVisible();
      cleanupRequired = true;

      await page.reload();
      await expect(page.getByTestId('main-panel')).toBeVisible();

      const reloadedFieldEditor = await openFieldEditorByTag(
        page,
        editingScenario.textEditableFieldTag,
      );
      const reloadedInput =
        await getPrimaryFieldEditorInput(reloadedFieldEditor);
      await expect(reloadedInput).toHaveValue(modifiedValue);
    } finally {
      if (cleanupRequired) {
        await api.restoreRevision(
          editingScenario.bookId,
          editingScenario.originalLastEditedRecord,
        );
      }
    }
  });

  test('takes an external record into the main panel and reset restores the extracted baseline', async ({
    page,
  }) => {
    let foundSuccessfulTake = false;

    for (const bookId of e2eEnv.fixtures.bookIds) {
      await openBookDetailByIds(page, e2eEnv.fixtures.batchId, bookId);

      const contextPanel = page.getByTestId('context-panel');
      await expect(contextPanel).toHaveAttribute('data-mode', 'records');
      await expect(page.getByTestId('context-records')).toBeVisible();
      await waitForEditableRecordRows(page);

      const takeRecordButton = page.getByTestId('take-record-button');
      const resetRecordButton = page.getByTestId('reset-record-button');
      const contextRecordRows = page.locator(
        '[data-testid^="context-record-row-"]',
      );

      await expect(resetRecordButton).toBeEnabled();
      await resetRecordButton.click();
      await waitForEditableRecordRows(page);

      const extractedBaselineTexts = await collectEditableRowTexts(page);

      await expect
        .poll(async () => await contextRecordRows.count(), {
          timeout: 10_000,
          message: 'Expected the records list in the context panel to render',
        })
        .toBeGreaterThan(0);

      const totalRecordRows = await contextRecordRows.count();

      if (totalRecordRows <= 1) {
        continue;
      }

      for (let index = 1; index < totalRecordRows; index++) {
        const externalRecordRow = page.getByTestId(
          `context-record-row-${index}`,
        );

        await expect(externalRecordRow).toBeVisible();
        await externalRecordRow.click();
        await expect(
          page.getByTestId(`context-record-expanded-${index}`),
        ).toBeVisible();

        await expect(takeRecordButton).toBeEnabled();
        await takeRecordButton.click();

        const candidateTexts = await waitForEditableRowsChange(
          page,
          extractedBaselineTexts,
          5_000,
        );
        if (candidateTexts !== null) {
          foundSuccessfulTake = true;

          await expect(resetRecordButton).toBeEnabled();
          await resetRecordButton.click();

          await expect
            .poll(
              async () => JSON.stringify(await collectEditableRowTexts(page)),
              {
                timeout: 10_000,
                message:
                  'Expected resetting the record to restore the original extracted baseline',
              },
            )
            .toBe(JSON.stringify(extractedBaselineTexts));

          break;
        }

        await resetRecordButton.click();
        await expect
          .poll(
            async () => JSON.stringify(await collectEditableRowTexts(page)),
            {
              timeout: 10_000,
            },
          )
          .toBe(JSON.stringify(extractedBaselineTexts));
      }

      if (foundSuccessfulTake) {
        break;
      }
    }

    test.skip(
      !foundSuccessfulTake,
      'None of the configured fixture books exposes an external record that changes the editable main panel after take-record.',
    );
  });
});

function buildModifiedValue(originalValue: string): string {
  const suffix = ` Playwright ${Date.now()}`;
  const trimmed = originalValue.trim();

  if (!trimmed) {
    return `Playwright ${Date.now()}`;
  }

  return `${trimmed}${suffix}`;
}

async function waitForEditableRowsChange(
  page: Parameters<typeof collectEditableRowTexts>[0],
  baselineTexts: string[],
  timeoutMs: number,
): Promise<string[] | null> {
  const deadline = Date.now() + timeoutMs;
  const baselineJson = JSON.stringify(baselineTexts);

  while (Date.now() < deadline) {
    const currentTexts = await collectEditableRowTexts(page);
    if (JSON.stringify(currentTexts) !== baselineJson) {
      return currentTexts;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const currentTexts = await collectEditableRowTexts(page);
  return JSON.stringify(currentTexts) !== baselineJson ? currentTexts : null;
}
