import { ApiImageItem, ID } from '@/app/models';
import { BreadcrumbsService } from '@/app/services/breadcrumbs.service';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { PermissionsService } from '@/app/services/permissions.service';
import {
  Component,
  computed,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BooksService } from '../../services/api/books.service';
import { ToastService } from '../../services/toast.service';
import { RecordStore } from '../../stores/record.store';
import { ContextPanelComponent } from '../context-panel/context-panel.component';
import { GalleryPanelComponent } from '../gallery-panel/gallery-panel.component';
import { MainPanelComponent } from '../main-panel/main-panel.component';

@Component({
  standalone: true,
  selector: 'app-book-detail',
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
  private permissions = inject(PermissionsService);

  readonly mainPanel = viewChild(MainPanelComponent);

  batchId = signal<ID | null>(null);
  batchName = signal<string | null>(null);

  galleryCollapsed = signal(false);
  bookId = signal<ID | null>(null);
  images = signal<ApiImageItem[]>([]);

  readonly canRead = computed(() => this.permissions.canRead(this.batchId()));

  readonly canWrite = computed(() => this.permissions.canWrite(this.batchId()));

  readonly canDelete = computed(() =>
    this.permissions.canDelete(this.batchId()),
  );

  readonly canExport = computed(() =>
    this.permissions.canExport(this.batchId()),
  );

  private showForbidden() {
    this.toast.show(
      this.translate.instant('messages.error.forbidden'),
      'error',
    );
  }

  onGalleryCollapsedChange(v: boolean) {
    this.galleryCollapsed.set(v);
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const batchIdParam = params.get('batchId');
      const parsedBatchId = Number(batchIdParam);
      const batchId =
        Number.isFinite(parsedBatchId) && parsedBatchId > 0
          ? parsedBatchId
          : null;

      const bookIdParam = params.get('bookId');
      const parsedBookId = Number(bookIdParam);
      const bookId =
        Number.isFinite(parsedBookId) && parsedBookId > 0 ? parsedBookId : null;

      if (batchId === null || bookId === null) {
        this.toast.show(
          this.translate.instant('messages.error.books.incorrect_id'),
          'error',
        );
        return;
      }

      this.batchId.set(batchId);
      this.bookId.set(bookId);
      this.resetBookDetail();
      this.loadBook(bookId);
    });
  }

  private resetBookDetail() {
    this.contextPanel.reset();

    this.batchName.set(null);

    this.store.setOpenedExisting(null);
    this.store.setOpenedExtracted(null);

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
          this.batchName.set(data.batch_name ?? null);
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

      if (!this.canWrite()) {
        this.showForbidden();
        return;
      }

      this.openAddFieldModal();
      return;
    }

    if (this.isAddSubfieldShortcut(event) && this.canOpenAddSubfield()) {
      event.preventDefault();

      if (!this.canWrite()) {
        this.showForbidden();
        return;
      }

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
      this.canWrite() &&
      state.mode === 'edit' &&
      !!state.fieldId &&
      this.isDataFieldTag(state.tag)
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
