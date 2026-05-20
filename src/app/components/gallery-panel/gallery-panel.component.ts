import { ApiImageItem, ID, ImgItem, PageType } from '@/app/models';
import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BooksService } from '../../services/api/books.service';
import { BookImageCacheService } from '../../services/book-image-cache.service';
import { IconComponent } from '../shared/icon/icon.component';
import { GalleryHeaderComponent } from './gallery-header/gallery-header.component';
import { ImageLargePreviewComponent } from './preview/preview.component';
import { ImageThumbnailsComponent } from './thumbnails/thumbnails.component';

type PreviewViewState = {
  scale: number;
  rotation: number;
  x: number;
  y: number;
};

@Component({
  standalone: true,
  selector: 'app-gallery-panel',
  imports: [
    ImageLargePreviewComponent,
    ImageThumbnailsComponent,
    GalleryHeaderComponent,
    TranslateModule,
    IconComponent,
  ],
  templateUrl: './gallery-panel.component.html',
})
export class GalleryPanelComponent {
  private bookService = inject(BooksService);
  private cache = inject(BookImageCacheService);
  private translate = inject(TranslateService);

  private previewHost = viewChild<ElementRef<HTMLElement>>('previewHost');

  readonly MIN_SCALE = 1;
  readonly MAX_SCALE = 8;
  readonly SCALE_STEP = 0.5;

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

  private viewStates = signal<Record<string, PreviewViewState>>({});

  isPreviewFullscreen = signal(false);

  @HostListener('document:fullscreenchange')
  onFullscreenChange() {
    const host = this.previewHost()?.nativeElement;
    this.isPreviewFullscreen.set(!!host && document.fullscreenElement === host);
  }

  selectedItem = computed(() => {
    const id = this.selectedId();
    return this.items().find((x) => x.id === id) ?? null;
  });

  selectedView = computed<PreviewViewState>(() => {
    const id = this.selectedId();
    if (!id) return this.defaultViewState();
    return this.viewStates()[String(id)] ?? this.defaultViewState();
  });

  canZoomOut = computed(() => this.selectedView().scale > this.MIN_SCALE);
  canZoomIn = computed(() => this.selectedView().scale < this.MAX_SCALE);
  canResetView = computed(() => {
    const view = this.selectedView();
    return view.scale > this.MIN_SCALE || view.x !== 0 || view.y !== 0;
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

  toggleCollapsed() {
    this.collapsed.update((v) => !v);
    this.collapsedChange.emit(this.collapsed());
  }

  resetView() {
    const id = this.selectedId();
    if (!id) return;

    this.patchView(id, (current) => ({
      ...current,
      scale: this.MIN_SCALE,
      x: 0,
      y: 0,
    }));
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
      this.viewStates.set({});

      if (!bookId || apiImages.length === 0) {
        this.items.set([]);
        this.selectedId.set(null);
        this.viewStates.set({});
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
          pageType: this.pageTypeLabel(img.page_categories[0] ?? 'Unknown'),

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

  onViewChange(view: { scale: number; x: number; y: number }) {
    const id = this.selectedId();
    if (!id) return;

    this.patchView(id, (current) => ({
      ...current,
      scale: view.scale,
      x: view.x,
      y: view.y,
    }));
  }

  private defaultViewState(): PreviewViewState {
    return {
      scale: 1,
      rotation: 0,
      x: 0,
      y: 0,
    };
  }

  normalizeRotation(rotation: number): 0 | 90 | 180 | 270 {
    const normalized = ((rotation % 360) + 360) % 360;

    if (normalized === 0) return 0;
    if (normalized === 90) return 90;
    if (normalized === 180) return 180;
    return 270;
  }

  private ensureViewState(id: ID): PreviewViewState {
    const key = String(id);
    const existing = this.viewStates()[key];
    if (existing) return existing;

    const next = this.defaultViewState();
    this.viewStates.update((map) => ({
      ...map,
      [key]: next,
    }));
    return next;
  }

  private patchView(
    id: ID,
    updater: (current: PreviewViewState) => PreviewViewState,
  ) {
    const key = String(id);
    this.viewStates.update((map) => {
      const current = map[key] ?? this.defaultViewState();
      return {
        ...map,
        [key]: updater(current),
      };
    });
  }

  private clampScale(scale: number): number {
    return Math.min(this.MAX_SCALE, Math.max(this.MIN_SCALE, scale));
  }

  private zoomAroundViewportCenter(id: ID, delta: number) {
    this.patchView(id, (current) => {
      const nextScale = this.clampScale(current.scale + delta);

      if (nextScale <= this.MIN_SCALE) {
        return {
          ...current,
          scale: this.MIN_SCALE,
          x: 0,
          y: 0,
        };
      }

      const k = nextScale / current.scale;

      return {
        ...current,
        scale: nextScale,
        x: current.x * k,
        y: current.y * k,
      };
    });
  }

  zoomIn() {
    const id = this.selectedId();
    if (!id) return;
    this.zoomAroundViewportCenter(id, this.SCALE_STEP);
  }

  zoomOut() {
    const id = this.selectedId();
    if (!id) return;
    this.zoomAroundViewportCenter(id, -this.SCALE_STEP);
  }

  rotateLeft() {
    const id = this.selectedId();
    if (!id) return;

    this.patchView(id, (current) => ({
      ...current,
      rotation: current.rotation - 90,
      x: 0,
      y: 0,
    }));
  }

  onPanChange(pan: { x: number; y: number }) {
    const id = this.selectedId();
    if (!id) return;

    this.patchView(id, (current) => ({
      ...current,
      x: pan.x,
      y: pan.y,
    }));
  }

  async togglePreviewFullscreen() {
    const host = this.previewHost()?.nativeElement;
    if (!host) return;

    if (document.fullscreenElement === host) {
      await document.exitFullscreen();
      return;
    }

    await host.requestFullscreen();
  }

  private buildGalleryKey(bookId: ID | null, images: ApiImageItem[]): string {
    if (!bookId || images.length === 0) return '';
    return `${bookId}::${images
      .map((x) => `${x.image_id}:${x.page_categories[0] ?? 'null'}`)
      .join(',')}`;
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
    this.ensureViewState(id);
    this.ensureThumbnail(id);
    this.ensureFull(id);
  }
}
