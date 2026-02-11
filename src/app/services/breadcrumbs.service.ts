import { Injectable, computed, signal } from '@angular/core';
import { ID } from '../models';

export type BreadcrumbItem = {
  label: string;
  url?: string;
};

@Injectable({ providedIn: 'root' })
export class BreadcrumbsService {
  readonly batchId = signal<ID | null>(null);
  readonly batchName = signal<string | null>(null);

  readonly bookId = signal<ID | null>(null);
  readonly bookTitle = signal<string | null>(null);

  setBatch(batchId: ID, name: string | null) {
    this.batchId.set(batchId);
    this.batchName.set(name);
  }

  setBook(bookId: ID, title: string | null) {
    this.bookId.set(bookId);
    this.bookTitle.set(title);
  }

  clearBook() {
    this.bookId.set(null);
    this.bookTitle.set(null);
  }

  clearBatch() {
    this.batchId.set(null);
    this.batchName.set(null);
    this.clearBook();
  }

  readonly crumbs = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { label: 'Seznam skupin', url: '/batches' },
    ];

    const batch_id = this.batchId();
    const batch_name = this.batchName();
    if (batch_id != null) {
      items.push({
        label: batch_name ?? batch_id.toString(),
        url: `/batches/${batch_id}/books`,
      });
    }

    const book_id = this.bookId();
    const book_title = this.bookTitle();
    if (book_id) {
      items.push({
        label: book_title ?? book_id.toString(),
      });
    }

    return items;
  });
}
