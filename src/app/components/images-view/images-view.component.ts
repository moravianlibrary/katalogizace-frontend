import { Component, computed, inject, input, signal } from '@angular/core';
import { ImgItem, UUID } from '../../models/book';
import { BooksService } from '../../services/books.service';
import { ImageLargePreviewComponent } from '../image/preview/preview.component';
import { ImageThumbnailsComponent } from '../image/thumbnails/thumbnails.component';

@Component({
  selector: 'app-images-view',
  imports: [ImageLargePreviewComponent, ImageThumbnailsComponent],
  templateUrl: './images-view.component.html',
})
export class ImagesViewComponent {
  private bookService = inject(BooksService);

  bookId = input<string | null>(null);
  imageIds = input<UUID[] | null>(null);

  items = signal<ImgItem[]>([]);
  selectedId = signal<string | null>(null);

  private fullLoaded = new Set<string>();

  selectedItem = computed(() => {
    const id = this.selectedId();
    return this.items().find((x) => x.id === id) ?? null;
  });

  ngOnInit() {
    const ids = this.imageIds() ?? [];
    this.items.set(
      ids.map<ImgItem>((id) => ({
        id,
        url: '',
        loading: true,
        error: null,
      })),
    );

    for (const id of ids) {
      this.bookService.getBookImage(this.bookId()!, id, true).subscribe({
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
                    error: 'Nepodařilo se načíst náhled.',
                  }
                : x,
            ),
          );
        },
      });
    }

    if (ids.length) {
      this.selectedId.set(ids[0]);
      this.ensureFull(ids[0]);
    }
  }

  ensureFull(id: string) {
    if (this.fullLoaded.has(id)) return;

    const it = this.items().find((x) => x.id === id);
    if (!it) return;

    this.bookService.getBookImage(this.bookId()!, id, false).subscribe({
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
            x.id === id ? { ...x, error: 'Nepodařilo se načíst obrázek.' } : x,
          ),
        );
      },
    });
  }

  onSelect(id: string) {
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
