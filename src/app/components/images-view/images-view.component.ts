import { ApiImageItem, ID, ImgItem, PageType } from '@/app/models';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { BooksService } from '../../services/api/books.service';
import { ImageLargePreviewComponent } from '../image/preview/preview.component';
import { ImageThumbnailsComponent } from '../image/thumbnails/thumbnails.component';

@Component({
  standalone: true,
  selector: 'app-images-view',
  imports: [ImageLargePreviewComponent, ImageThumbnailsComponent],
  templateUrl: './images-view.component.html',
})
export class ImagesViewComponent {
  private bookService = inject(BooksService);

  bookId = input<ID | null>(null);
  images = input<ApiImageItem[]>([]);

  items = signal<ImgItem[]>([]);
  selectedId = signal<ID | null>(null);

  private fullLoaded = new Set<ID>();

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
        return 'Neznámý typ strany';
    }
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
                        error: 'Nepodařilo se načíst náhled.',
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
                ? { ...x, error: 'Nepodařilo se načíst obrázek.' }
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
