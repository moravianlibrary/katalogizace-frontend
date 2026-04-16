import { Injectable, OnDestroy } from '@angular/core';

type CacheVariant = 'thumb' | 'full';

type ImageCacheEntry = {
  objectUrl: string;
  sizeBytes: number;
  createdAt: number;
  lastAccessedAt: number;
};

@Injectable({ providedIn: 'root' })
export class BookImageCacheService implements OnDestroy {
  private cache = new Map<string, ImageCacheEntry>();

  private readonly maxFullBooks = 10;
  private fullBookLru: string[] = [];

  private makeKey(
    bookId: string,
    imageId: string,
    variant: CacheVariant,
  ): string {
    return `${bookId}:${imageId}:${variant}`;
  }

  private touchFullBook(bookId: string) {
    const idx = this.fullBookLru.indexOf(bookId);
    if (idx !== -1) {
      this.fullBookLru.splice(idx, 1);
    }
    this.fullBookLru.push(bookId);
  }

  private removeFullBookFromLru(bookId: string) {
    const idx = this.fullBookLru.indexOf(bookId);
    if (idx !== -1) {
      this.fullBookLru.splice(idx, 1);
    }
  }

  private evictOldFullBooksIfNeeded() {
    while (this.fullBookLru.length > this.maxFullBooks) {
      const oldestBookId = this.fullBookLru[0];
      if (!oldestBookId) return;
      this.clearBookVariant(oldestBookId, 'full');
    }
  }

  get(
    bookId: string,
    imageId: string,
    variant: CacheVariant,
  ): ImageCacheEntry | null {
    const key = this.makeKey(bookId, imageId, variant);
    const entry = this.cache.get(key);
    if (!entry) return null;

    entry.lastAccessedAt = Date.now();

    if (variant === 'full') {
      this.touchFullBook(bookId);
    }

    return entry;
  }

  set(
    bookId: string,
    imageId: string,
    variant: CacheVariant,
    blob: Blob,
  ): ImageCacheEntry {
    const key = this.makeKey(bookId, imageId, variant);

    const existing = this.cache.get(key);
    if (existing) {
      URL.revokeObjectURL(existing.objectUrl);
    }

    const entry: ImageCacheEntry = {
      objectUrl: URL.createObjectURL(blob),
      sizeBytes: blob.size,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    this.cache.set(key, entry);

    if (variant === 'full') {
      this.touchFullBook(bookId);
      this.evictOldFullBooksIfNeeded();
    }

    return entry;
  }

  clearBookVariant(bookId: string, variant: CacheVariant) {
    const suffix = `:${variant}`;
    const prefix = `${bookId}:`;

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(prefix) && key.endsWith(suffix)) {
        URL.revokeObjectURL(entry.objectUrl);
        this.cache.delete(key);
      }
    }

    if (variant === 'full') {
      this.removeFullBookFromLru(bookId);
    }
  }

  clearBook(bookId: string) {
    this.clearBookVariant(bookId, 'thumb');
    this.clearBookVariant(bookId, 'full');
  }

  clearAll() {
    for (const entry of this.cache.values()) {
      URL.revokeObjectURL(entry.objectUrl);
    }
    this.cache.clear();
    this.fullBookLru = [];
  }

  getStats() {
    let thumbCount = 0;
    let fullCount = 0;
    let thumbBytes = 0;
    let fullBytes = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (key.endsWith(':thumb')) {
        thumbCount++;
        thumbBytes += entry.sizeBytes;
      } else if (key.endsWith(':full')) {
        fullCount++;
        fullBytes += entry.sizeBytes;
      }
    }

    return {
      thumbCount,
      fullCount,
      thumbBytes,
      fullBytes,
      totalCount: thumbCount + fullCount,
      totalBytes: thumbBytes + fullBytes,
      fullBookLru: [...this.fullBookLru],
    };
  }

  ngOnDestroy() {
    this.clearAll();
  }
}
