import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { AppApiClient } from './support/api-client';
import { e2eEnv } from './support/env';
import { extractBookRowIds } from './support/ui-helpers';

const UPLOAD_FIXTURE_IMAGE = resolveUploadFixtureImage();

test.describe.serial('upload flow', () => {
  let api: AppApiClient;

  test.beforeAll(async ({ playwright }) => {
    api = await AppApiClient.create(playwright);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('uploads an image into the upload fixture batch and cleans up the created book', async ({
    page,
  }) => {
    const uploadBatchId = e2eEnv.fixtures.uploadBatchId;
    const beforeBooks = await api.listBooks(uploadBatchId, {
      forceRefresh: true,
    });
    const knownBookIds = new Set(beforeBooks.books.map((book) => book.book_id));

    try {
      await page.goto(`/batches/${uploadBatchId}/books`);
      await expect(page.getByTestId('books-page')).toBeVisible();

      await page
        .getByTestId('books-upload-input')
        .setInputFiles(UPLOAD_FIXTURE_IMAGE);

      await expect(page.getByTestId('upload-books-button')).toBeEnabled({
        timeout: 30_000,
      });

      await expect
        .poll(
          async () => {
            const refreshed = await api.listBooks(uploadBatchId, {
              forceRefresh: true,
            });
            return refreshed.books.filter(
              (book) => !knownBookIds.has(book.book_id),
            ).length;
          },
          {
            timeout: 15_000,
            message:
              'Expected image upload to create at least one new book in the upload fixture batch',
          },
        )
        .toBeGreaterThan(0);

      const rowIds = await extractBookRowIds(page);
      expect(rowIds.length).toBeGreaterThanOrEqual(beforeBooks.books.length);
    } finally {
      const afterBooks = await api.listBooks(uploadBatchId, {
        forceRefresh: true,
      });
      const createdBookIds = afterBooks.books
        .filter((book) => !knownBookIds.has(book.book_id))
        .map((book) => book.book_id);

      for (const bookId of createdBookIds) {
        await api.deleteBook(bookId);
      }
    }
  });
});

function resolveUploadFixtureImage(): string {
  const candidates = [
    path.join(process.cwd(), 'e2e/fixtures/upload-book.jpg'),
    path.join(process.cwd(), 'e2e/fixtures/upload-book.jpeg'),
    path.join(process.cwd(), 'e2e/fixtures/upload-book.png'),
    path.join(process.cwd(), 'e2e/fixtures/upload-book.webp'),
    path.join(process.cwd(), 'public/images/sad-avatar.png'),
  ];

  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolved) {
    throw new Error(
      'No upload fixture image was found. Add e2e/fixtures/upload-book.jpg (or png/jpeg/webp), or restore the fallback image.',
    );
  }

  return resolved;
}
