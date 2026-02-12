import { ApiImageItem, ID, ImgItem, PageType } from '@/app/models';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BooksService } from '../../services/api/books.service';
import { GalleryHeaderComponent } from './gallery-header/gallery-header.component';
import { ImageLargePreviewComponent } from './preview/preview.component';
import { ImageThumbnailsComponent } from './thumbnails/thumbnails.component';

@Component({
  standalone: true,
  selector: 'app-gallery',
  imports: [
    ImageLargePreviewComponent,
    ImageThumbnailsComponent,
    GalleryHeaderComponent,
    TranslateModule,
  ],
  templateUrl: './gallery.component.html',
})
export class GalleryComponent {
  private bookService = inject(BooksService);
  private translate = inject(TranslateService);

  bookId = input<ID | null>(null);
  images = input<ApiImageItem[]>([]);

  items = signal<ImgItem[]>([]);
  selectedId = signal<ID | null>(null);

  private fullLoaded = new Set<ID>();

  collapsed = signal(false);
  collapsedChange = output<boolean>();

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
      const apiImages = this.images();
      const bookId = this.bookId();

      if (!bookId || apiImages.length === 0) {
        this.items.set([]);
        this.selectedId.set(null);
        this.fullLoaded.clear();
        return;
      }

      this.items.set(
        apiImages.map((img) => ({
          id: img.image_id,
          url: '',
          loading: true,
          error: null,
          pageType: this.pageTypeLabel(img.page_type),
        })),
      );

      this.fullLoaded.clear();

      const firstId = apiImages[0].image_id;
      this.selectedId.set(firstId);

      for (const img of apiImages) {
        const id = img.image_id;
        this.bookService
          .getBookImage(bookId.toString(), id.toString(), true)
          .subscribe({
            next: (blob) => {
              const url = URL.createObjectURL(blob);
              this.items.update((arr) =>
                arr.map((x) =>
                  x.id === id ? { ...x, url, loading: false, error: null } : x,
                ),
              );
            },
            error: () => {
              this.items.update((arr) =>
                arr.map((x) =>
                  x.id === id
                    ? {
                        ...x,
                        loading: false,
                        error: this.translate.instant(
                          'messages.error.books.thumbnail_load',
                        ),
                      }
                    : x,
                ),
              );
            },
          });
      }

      setTimeout(() => {
        if (this.selectedId() === firstId) this.ensureFull(firstId);
      });
    });
  }

  ensureFull(id: ID) {
    if (this.fullLoaded.has(id)) return;

    const it = this.items().find((x) => x.id === id);
    if (!it) return;

    this.bookService
      .getBookImage(this.bookId()!.toString(), id.toString(), false)
      .subscribe({
        next: (blob) => {
          const fullUrl = URL.createObjectURL(blob);
          if (it.url) URL.revokeObjectURL(it.url);

          this.items.update((arr) =>
            arr.map((x) =>
              x.id === id ? { ...x, url: fullUrl, error: null } : x,
            ),
          );
          this.fullLoaded.add(id);
        },
        error: () => {
          this.items.update((arr) =>
            arr.map((x) =>
              x.id === id
                ? {
                    ...x,
                    error: this.translate.instant(
                      'messages.error.books.image_load',
                    ),
                  }
                : x,
            ),
          );
        },
      });
  }

  onSelect(id: ID) {
    this.selectedId.set(id);
    this.ensureFull(id);
  }

  ngOnDestroy() {
    for (const it of this.items()) {
      if (it.url) URL.revokeObjectURL(it.url);
    }
    this.fullLoaded.clear();
  }
}
