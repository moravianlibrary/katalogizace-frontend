import { expect, Page, test } from '@playwright/test';
import { e2eEnv } from './support/env';
import { openBookDetailByIds } from './support/ui-helpers';

test.describe.serial('context-side flows on fixture books', () => {
  test('toggles compare mode against an opened external record', async ({
    page,
  }) => {
    const foundMatch = await findFixtureContextRecord(page, async () => true, {
      includeExtracted: false,
    });

    test.skip(
      foundMatch === null,
      'No configured fixture book exposes an external record in the context panel.',
    );

    const toggle = page.getByTestId('compare-records-toggle');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  test('opens the candidates panel from a field with multiple candidates', async ({
    page,
  }) => {
    const foundMatch = await findFixtureContextRecord(
      page,
      async (expandedRecord) =>
        (await countEventually(
          () => expandedRecord.getByTestId('show-candidates-button').count(),
          5_000,
        )) > 0,
      {
        includeExtracted: true,
      },
    );

    test.skip(
      foundMatch === null,
      'No configured fixture book exposes a field with multiple candidates.',
    );

    const expandedRecord = page.getByTestId(
      `context-record-expanded-${foundMatch!.rowIndex}`,
    );
    await expandedRecord.getByTestId('show-candidates-button').first().click();

    const contextPanel = page.getByTestId('context-panel');
    await expect(contextPanel).toHaveAttribute('data-mode', 'candidates');
    await expect(page.getByTestId('candidates-table')).toBeVisible();
    const candidateRows = page.locator('[data-testid^="candidate-row-"]');
    await expect
      .poll(async () => await candidateRows.count(), {
        timeout: 10_000,
        message:
          'Expected the candidates panel to render at least one candidate row',
      })
      .toBeGreaterThan(0);

    const candidateCount = await candidateRows.count();
    test.skip(
      candidateCount <= 1,
      'The selected fixture field opens the candidates panel, but it does not expose multiple candidate rows.',
    );

    await page.getByTestId('context-back-button').click();
    await expect(contextPanel).toHaveAttribute('data-mode', 'records');
  });

  test('opens provenance timeline from a scored field', async ({ page }) => {
    const foundMatch = await findFixtureContextRecord(
      page,
      async (expandedRecord) =>
        (await countEventually(
          () => expandedRecord.getByTestId('show-provenance-button').count(),
          5_000,
        )) > 0,
      {
        includeExtracted: true,
      },
    );

    test.skip(
      foundMatch === null,
      'No configured fixture book exposes provenance for a visible field.',
    );

    const expandedRecord = page.getByTestId(
      `context-record-expanded-${foundMatch!.rowIndex}`,
    );
    await expandedRecord.getByTestId('show-provenance-button').first().click();

    const contextPanel = page.getByTestId('context-panel');
    await expect(contextPanel).toHaveAttribute('data-mode', 'provenance');
    await expect(page.getByTestId('provenance-timeline')).toBeVisible();
  });
});

async function findFixtureContextRecord(
  page: Page,
  predicate: (
    expandedRecord: ReturnType<Page['getByTestId']>,
  ) => Promise<boolean>,
  options: { includeExtracted: boolean },
): Promise<{ bookId: number; rowIndex: number } | null> {
  for (const bookId of e2eEnv.fixtures.bookIds) {
    await openBookDetailByIds(page, e2eEnv.fixtures.batchId, bookId);
    await expect(page.getByTestId('context-panel')).toHaveAttribute(
      'data-mode',
      'records',
    );
    await expect(page.getByTestId('context-records')).toBeVisible();

    const rowCount = await countEventually(
      () => page.locator('[data-testid^="context-record-row-"]').count(),
      5_000,
    );

    const startIndex = options.includeExtracted ? 0 : 1;

    for (let rowIndex = startIndex; rowIndex < rowCount; rowIndex++) {
      const row = page.getByTestId(`context-record-row-${rowIndex}`);
      await expect(row).toBeVisible();
      await row.click();

      const expandedRecord = page.getByTestId(
        `context-record-expanded-${rowIndex}`,
      );
      await expect(expandedRecord).toBeVisible();

      if (await predicate(expandedRecord)) {
        return { bookId, rowIndex };
      }
    }
  }

  return null;
}

async function countEventually(
  getCount: () => Promise<number>,
  timeoutMs: number,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const count = await getCount();
    if (count > 0) {
      return count;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return await getCount();
}
