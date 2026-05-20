import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BooksService } from './api/books.service';

type PendingUpload = {
  tempId: string;
  startedAt: number;
};

@Injectable({ providedIn: 'root' })
export class ScanSessionService {
  private readonly books = inject(BooksService);

  readonly batchId = signal<string | null>(null);
  readonly currentBookId = signal<string | null>(null);

  readonly pageCount = signal(0);

  readonly initialized = signal(false);
  readonly creatingBook = signal(false);
  readonly actionBusy = signal(false);
  readonly captureBusy = signal(false);
  readonly workflowStarting = signal(false);

  readonly pendingUploads = signal<PendingUpload[]>([]);

  readonly canCapture = computed(
    () => !!this.currentBookId() && !this.creatingBook() && !this.actionBusy(),
  );

  readonly canCancel = computed(
    () => !!this.currentBookId() && !this.actionBusy(),
  );

  readonly canSave = computed(
    () => !!this.currentBookId() && this.pageCount() > 0 && !this.actionBusy(),
  );

  readonly canNext = computed(
    () => !!this.currentBookId() && this.pageCount() > 0 && !this.actionBusy(),
  );

  async start(batchId: string) {
    if (this.initialized()) return;

    this.batchId.set(batchId);
    this.creatingBook.set(true);

    try {
      const res = await firstValueFrom(this.books.createBook(batchId));
      this.currentBookId.set(String(res.book_id));
      this.pageCount.set(0);
      this.initialized.set(true);
    } finally {
      this.creatingBook.set(false);
    }
  }

  async capture(blob: Blob) {
    const bookId = this.currentBookId();
    if (!bookId || this.actionBusy()) return;

    const tempId = crypto.randomUUID();

    this.captureBusy.set(true);
    this.pendingUploads.update((items) => [
      ...items,
      { tempId, startedAt: Date.now() },
    ]);

    this.pageCount.update((count) => count + 1);

    try {
      await firstValueFrom(this.books.uploadBookImage(bookId, blob));
    } catch (error) {
      this.pageCount.update((count) => Math.max(0, count - 1));
      throw error;
    } finally {
      this.pendingUploads.update((items) =>
        items.filter((item) => item.tempId !== tempId),
      );
      this.captureBusy.set(this.pendingUploads().length > 0);
    }
  }

  async saveAndExit() {
    const bookId = this.currentBookId();
    if (!bookId || this.pageCount() === 0) return;

    this.actionBusy.set(true);
    this.workflowStarting.set(true);

    try {
      await this.waitForUploadsToFinish();
      await firstValueFrom(this.books.startBookWorkflow(bookId));
      this.resetState();
    } finally {
      this.workflowStarting.set(false);
      this.actionBusy.set(false);
    }
  }

  async nextBook() {
    const currentBookId = this.currentBookId();
    const batchId = this.batchId();

    if (!currentBookId || !batchId || this.pageCount() === 0) return;

    this.actionBusy.set(true);
    this.workflowStarting.set(true);
    this.creatingBook.set(true);

    try {
      await this.waitForUploadsToFinish();

      await firstValueFrom(this.books.startBookWorkflow(currentBookId));

      const nextBook = await firstValueFrom(this.books.createBook(batchId));

      this.currentBookId.set(String(nextBook.book_id));
      this.pageCount.set(0);
    } finally {
      this.workflowStarting.set(false);
      this.creatingBook.set(false);
      this.actionBusy.set(false);
    }
  }

  async cancelAndDeleteCurrent() {
    const bookId = this.currentBookId();
    if (!bookId) return;

    this.actionBusy.set(true);

    try {
      await firstValueFrom(this.books.deleteBookRecord(bookId));
      this.resetState();
    } finally {
      this.actionBusy.set(false);
    }
  }

  async cleanupIfEmpty() {
    const bookId = this.currentBookId();
    if (!bookId) return;

    if (this.pageCount() > 0) return;
    if (this.pendingUploads().length > 0) return;

    try {
      await firstValueFrom(this.books.deleteBookRecord(bookId));
    } catch {
    } finally {
      this.resetState();
    }
  }

  private async waitForUploadsToFinish() {
    while (this.pendingUploads().length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  private resetState() {
    this.currentBookId.set(null);
    this.pageCount.set(0);
    this.pendingUploads.set([]);
    this.captureBusy.set(false);
    this.initialized.set(false);
  }
}
