import { ApiImageItem, ID, ImgItem, PageType } from '@/app/models';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BooksService } from '../../services/api/books.service';
import { BookImageCacheService } from '../../services/book-image-cache.service';
import { GalleryHeaderComponent } from './gallery-header/gallery-header.component';
import { ImageLargePreviewComponent } from './preview/preview.component';
import { ImageThumbnailsComponent } from './thumbnails/thumbnails.component';

@Component({
  standalone: true,
  selector: 'app-gallery-panel',
  imports: [
    ImageLargePreviewComponent,
    ImageThumbnailsComponent,
    GalleryHeaderComponent,
    TranslateModule,
  ],
  templateUrl: './gallery-panel.component.html',
})
export class GalleryPanelComponent {
  private bookService = inject(BooksService);
  private cache = inject(BookImageCacheService);
  private translate = inject(TranslateService);

  bookId = input<ID | null>(null);
  images = input<ApiImageItem[]>([]);

  items = signal<ImgItem[]>([]);
  selectedId = signal<ID | null>(null);

  collapsed = signal(false);
  collapsedChange = output<boolean>();

  private lastGalleryKey = '';
  private gallerySession = 0;

  private thumbInFlight = new Set<string>();
  private fullInFlight = new Set<string>();

  toggleCollapsed() {
    this.collapsed.update((v) => !v);
    this.collapsedChange.emit(this.collapsed());
  }

  selectedItem = computed(() => {
    const id = this.selectedId();
    return this.items().find((x) => x.id === id) ?? null;
  });

  pageIndex = computed(() => {
    const id = this.selectedId();
    const arr = this.items();
    if (!id) return null;

    const i = arr.findIndex((x) => x.id === id);
    return i === -1 ? null : i + 1;
  });

  pageCount = computed(() => this.items().length || null);

  pageTypeLabel(pt: PageType | null): string {
    return this.translate.instant(`pageType.${pt ?? 'Unknown'}`);
  }

  constructor() {
    effect(() => {
      const bookId = this.bookId();
      const apiImages = this.images();

      const galleryKey = this.buildGalleryKey(bookId, apiImages);
      if (galleryKey === this.lastGalleryKey) return;
      this.lastGalleryKey = galleryKey;

      this.gallerySession++;
      this.thumbInFlight.clear();
      this.fullInFlight.clear();

      if (!bookId || apiImages.length === 0) {
        this.items.set([]);
        this.selectedId.set(null);
        return;
      }

      const previousSelectedId = untracked(() => this.selectedId());
      const bookIdStr = String(bookId);

      const nextItems: ImgItem[] = apiImages.map((img) => {
        const imageIdStr = String(img.image_id);
        const thumbCached = this.cache.get(bookIdStr, imageIdStr, 'thumb');
        const fullCached = this.cache.get(bookIdStr, imageIdStr, 'full');

        return {
          id: img.image_id,
          pageType: this.pageTypeLabel(img.page_type),

          thumbUrl: thumbCached?.objectUrl ?? null,
          thumbLoading: !thumbCached,
          thumbError: null,

          fullUrl: fullCached?.objectUrl ?? null,
          fullLoading: false,
          fullError: null,
        };
      });

      this.items.set(nextItems);

      const initialSelectedId =
        previousSelectedId &&
        apiImages.some((img) => img.image_id === previousSelectedId)
          ? previousSelectedId
          : apiImages[0].image_id;

      this.selectedId.set(initialSelectedId);

      queueMicrotask(() => {
        for (const img of apiImages) {
          this.ensureThumbnail(img.image_id);
        }
        this.ensureFull(initialSelectedId);
      });
    });
  }

  private buildGalleryKey(bookId: ID | null, images: ApiImageItem[]): string {
    if (!bookId || images.length === 0) return '';
    return `${bookId}::${images.map((x) => x.image_id).join(',')}`;
  }

  private makeRequestKey(
    bookId: string,
    imageId: string,
    variant: 'thumb' | 'full',
  ): string {
    return `${bookId}:${imageId}:${variant}`;
  }

  private isStillCurrent(bookId: string, session: number): boolean {
    return String(this.bookId()) === bookId && this.gallerySession === session;
  }

  private updateItem(id: ID, patch: Partial<ImgItem>) {
    this.items.update((arr) =>
      arr.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    );
  }

  private async downloadImageBlob(
    bookId: string,
    imageId: string,
    thumbnail: boolean,
  ): Promise<Blob> {
    const { url } = await new Promise<{
      url: string;
      expiration_seconds: number;
    }>((resolve, reject) => {
      this.bookService.getBookImageUrl(bookId, imageId, thumbnail).subscribe({
        next: resolve,
        error: reject,
      });
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Image fetch failed with status ${response.status}`);
    }

    return await response.blob();
  }

  async ensureThumbnail(id: ID) {
    const bookId = untracked(() => this.bookId());
    if (!bookId) return;

    const session = this.gallerySession;
    const bookIdStr = String(bookId);
    const imageIdStr = String(id);
    const requestKey = this.makeRequestKey(bookIdStr, imageIdStr, 'thumb');

    const item = untracked(() => this.items().find((x) => x.id === id));
    if (!item) return;

    const cached = this.cache.get(bookIdStr, imageIdStr, 'thumb');
    if (cached) {
      if (item.thumbUrl !== cached.objectUrl) {
        this.updateItem(id, {
          thumbUrl: cached.objectUrl,
          thumbLoading: false,
          thumbError: null,
        });
      }
      return;
    }

    if (this.thumbInFlight.has(requestKey)) return;

    this.thumbInFlight.add(requestKey);

    this.updateItem(id, {
      thumbLoading: true,
      thumbError: null,
    });

    try {
      const blob = await this.downloadImageBlob(bookIdStr, imageIdStr, true);

      if (!this.isStillCurrent(bookIdStr, session)) return;

      const entry = this.cache.set(bookIdStr, imageIdStr, 'thumb', blob);

      if (!this.isStillCurrent(bookIdStr, session)) return;

      this.updateItem(id, {
        thumbUrl: entry.objectUrl,
        thumbLoading: false,
        thumbError: null,
      });
    } catch {
      if (!this.isStillCurrent(bookIdStr, session)) return;

      this.updateItem(id, {
        thumbLoading: false,
        thumbError: this.translate.instant(
          'messages.error.books.thumbnail_load',
        ),
      });
    } finally {
      this.thumbInFlight.delete(requestKey);
    }
  }

  async ensureFull(id: ID) {
    const bookId = untracked(() => this.bookId());
    if (!bookId) return;

    const session = this.gallerySession;
    const bookIdStr = String(bookId);
    const imageIdStr = String(id);
    const requestKey = this.makeRequestKey(bookIdStr, imageIdStr, 'full');

    const item = untracked(() => this.items().find((x) => x.id === id));
    if (!item) return;

    const cached = this.cache.get(bookIdStr, imageIdStr, 'full');
    if (cached) {
      if (item.fullUrl !== cached.objectUrl) {
        this.updateItem(id, {
          fullUrl: cached.objectUrl,
          fullLoading: false,
          fullError: null,
        });
      }
      return;
    }

    if (this.fullInFlight.has(requestKey)) return;

    this.fullInFlight.add(requestKey);

    this.updateItem(id, {
      fullLoading: true,
      fullError: null,
    });

    try {
      const blob = await this.downloadImageBlob(bookIdStr, imageIdStr, false);

      if (!this.isStillCurrent(bookIdStr, session)) return;

      const entry = this.cache.set(bookIdStr, imageIdStr, 'full', blob);

      if (!this.isStillCurrent(bookIdStr, session)) return;

      this.updateItem(id, {
        fullUrl: entry.objectUrl,
        fullLoading: false,
        fullError: null,
      });
    } catch {
      if (!this.isStillCurrent(bookIdStr, session)) return;

      this.updateItem(id, {
        fullLoading: false,
        fullError: this.translate.instant('messages.error.books.image_load'),
      });
    } finally {
      this.fullInFlight.delete(requestKey);
    }
  }

  onSelect(id: ID) {
    this.selectedId.set(id);
    this.ensureThumbnail(id);
    this.ensureFull(id);
  }
}
