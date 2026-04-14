import { ApiImageItem, ID } from '@/app/models';
import { BreadcrumbsService } from '@/app/services/breadcrumbs.service';
import { ContextPanelService } from '@/app/services/context-panel.service';
import {
  Component,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BooksService } from '../../services/api/books.service';
import { MarcDiffService } from '../../services/marc-diff.service';
import { ToastService } from '../../services/toast.service';
import { RecordStore } from '../../stores/record.store';
import { ContextPanelComponent } from '../context-panel/context-panel.component';
import { GalleryPanelComponent } from '../gallery-panel/gallery-panel.component';
import { MainPanelComponent } from '../main-panel/main-panel.component';

@Component({
  standalone: true,
  selector: 'app-book-detail',
  providers: [RecordStore, MarcDiffService],
  imports: [GalleryPanelComponent, MainPanelComponent, ContextPanelComponent],
  templateUrl: 'book-detail.component.html',
})
export class BookDetailComponent {
  private route = inject(ActivatedRoute);
  private bookService = inject(BooksService);
  private store = inject(RecordStore);
  private toast = inject(ToastService);
  private breadcrumbs = inject(BreadcrumbsService);
  private translate = inject(TranslateService);
  private contextPanel = inject(ContextPanelService);

  readonly mainPanel = viewChild(MainPanelComponent);

  galleryCollapsed = signal(false);
  bookId = signal<ID | null>(null);
  images = signal<ApiImageItem[]>([]);

  onGalleryCollapsedChange(v: boolean) {
    this.galleryCollapsed.set(v);
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('bookId');
      const n = Number(id);
      const bookId = Number.isFinite(n) ? n : null;

      if (bookId === null) {
        this.toast.show(
          this.translate.instant('messages.error.books.incorrect_id'),
          'error',
        );
        return;
      }

      this.bookId.set(bookId);
      this.resetBookDetail();
      this.loadBook(bookId);
    });
  }

  private resetBookDetail() {
    this.store.setExtracted(null);
    this.store.setProvenance({});
    this.store.setLastEdited(null);
    this.store.setExistingRecords([]);
    this.store.setTitle(null);
    this.store.setAuthor(null);
    this.store.setYearOfPublication(null);
  }

  private loadBook(bookId: ID) {
    this.images.set([]);

    this.bookService.getBookResult(bookId.toString()).subscribe({
      next: (data) => {
        this.images.set(data.images);

        this.store.setExtracted(data.extracted_MARC_record);
        this.store.setProvenance(data.provenance ?? {});
        this.store.setLastEdited(data.last_edited_record);
        this.store.setExistingRecords(data.existing_MARC_records);
        this.store.setTitle(data.title);
        this.store.setAuthor(data.author);
        this.store.setYearOfPublication(data.year_of_publishing);

        if (data.batch_id != null) {
          this.breadcrumbs.setBatch(data.batch_id, data.batch_name ?? null);
        }

        this.breadcrumbs.setBook(bookId, data.title);
      },
      error: (err) => {
        this.toast.show(
          this.translate.instant('messages.error.books.detail_load'),
          'error',
        );
        console.error('Error:', err);

        this.breadcrumbs.setBook(bookId, String(bookId));
      },
    });
  }

  ngOnDestroy() {
    this.breadcrumbs.clearBook();
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent) {
    if (this.shouldIgnoreShortcut(event)) return;

    if (this.isAddFieldShortcut(event)) {
      event.preventDefault();
      this.openAddFieldModal();
      return;
    }

    if (this.isAddSubfieldShortcut(event) && this.canOpenAddSubfield()) {
      event.preventDefault();
      this.openAddSubfieldModal();
    }
  }

  private isAddFieldShortcut(event: KeyboardEvent): boolean {
    const mod = event.ctrlKey || event.metaKey;
    return mod && event.shiftKey && event.key.toLowerCase() === 'f';
  }

  private isAddSubfieldShortcut(event: KeyboardEvent): boolean {
    const mod = event.ctrlKey || event.metaKey;
    return mod && event.shiftKey && event.key.toLowerCase() === 's';
  }

  private shouldIgnoreShortcut(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    if (!target) return false;

    return target.isContentEditable;
  }

  private canOpenAddSubfield(): boolean {
    const state = this.contextPanel.state();
    return (
      state.mode === 'edit' && !!state.fieldId && this.isDataFieldTag(state.tag)
    );
  }

  private isDataFieldTag(tag?: string): boolean {
    if (!tag) return false;

    const n = Number(tag);
    return Number.isInteger(n) && n >= 10;
  }

  private openAddFieldModal() {
    this.mainPanel()?.addField();
  }

  private openAddSubfieldModal() {
    this.contextPanel.requestAddSubfieldDialogOpen();
  }
}
