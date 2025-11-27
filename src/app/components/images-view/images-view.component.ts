import { Component, computed, inject, input, signal } from '@angular/core';
import { ApiImageItem, ImgItem, PageType } from '../../models/book';
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
  images = input<ApiImageItem[] | null>(null);

  items = signal<ImgItem[]>([]);
  selectedId = signal<string | null>(null);

  private fullLoaded = new Set<string>();

  selectedItem = computed(() => {
    const id = this.selectedId();
    return this.items().find((x) => x.id === id) ?? null;
  });

  pageTypeLabel(pt: PageType | null): string {
    switch (pt) {
      case 'TitlePage':
        return 'Titulní strana';
      case 'TableOfContents':
        return 'Obsah';
      case 'FrontCover':
        return 'Přední obálka';
      case 'BackCover':
        return 'Zadní obálka';
      case 'Impressum':
        return 'Tiráž';
      case 'EndPage':
        return 'Poslední čísl. strana';
      case 'Unknown':
      default:
        return 'Neznámý typ stránky';
    }
  }

  ngOnInit() {
    const apiImages = this.images() ?? [];

    this.items.set(
      apiImages.map<ImgItem>((img) => ({
        id: img.image_id,
        url: '',
        loading: true,
        error: null,
        pageType: this.pageTypeLabel(img.page_type),
      })),
    );

    for (const img of apiImages) {
      const id = img.image_id;
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

    if (apiImages.length) {
      const firstId = apiImages[0].image_id;
      this.selectedId.set(firstId);
      this.ensureFull(firstId);
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
