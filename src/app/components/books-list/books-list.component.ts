import {
  BatchDto,
  ID,
  PaginatedBooksResponseDto,
  ProcessState,
  RecordState,
} from '@/app/models';
import { BookImageCacheService } from '@/app/services/book-image-cache.service';
import { BreadcrumbsService } from '@/app/services/breadcrumbs.service';
import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest } from 'rxjs';
import { ProcessStateLabelPipe } from '../../pipes/process-state-label.pipe';
import { RecordStateLabelPipe } from '../../pipes/record-state-label.pipe';
import { BatchesService } from '../../services/api/batches.service';
import { BooksService } from '../../services/api/books.service';
import { ContextPanelService } from '../../services/context-panel.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-books-list',
  imports: [
    NgClass,
    DatePipe,
    RouterModule,
    RecordStateLabelPipe,
    ProcessStateLabelPipe,
    TranslateModule,
    IconComponent,
  ],
  templateUrl: 'books-list.component.html',
})
export class BooksListComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private books = inject(BooksService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);
  private cps = inject(ContextPanelService);
  private batchesService = inject(BatchesService);
  private breadcrumbs = inject(BreadcrumbsService);
  private translate = inject(TranslateService);
  private bookImageCacheService = inject(BookImageCacheService);

  isUploading = false;

  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  data = signal<PaginatedBooksResponseDto | null>(null);

  batchId = signal<ID | null>(null);
  batch = signal<BatchDto | null>(null);

  page = signal<number>(1);
  pageSize = signal<number>(100);

  sortBy = signal<'created_at' | 'modified_at' | null>(null);
  sortDir = signal<'asc' | 'desc'>('desc');

  totalPages = computed(() =>
    this.data()
      ? Math.max(1, Math.ceil(this.data()!.total / this.data()!.page_size))
      : 1,
  );

  rows = computed<PaginatedBooksResponseDto['books']>(() => {
    const books = this.data()?.books ?? [];
    const sortBy = this.sortBy();

    if (!sortBy) {
      return books;
    }

    const sortDir = this.sortDir();

    return [...books].sort((a, b) => {
      const aTime = a[sortBy] ? new Date(a[sortBy]).getTime() : 0;
      const bTime = b[sortBy] ? new Date(b[sortBy]).getTime() : 0;

      return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
    });
  });

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([pm, qp]) => {
        const bidParam = pm.get('batchId');
        const bid = bidParam !== null ? Number(bidParam) : null;
        this.batchId.set(bid);

        const p = Number(qp.get('page') ?? '1');
        const ps = Number(qp.get('page_size') ?? '100');
        this.page.set(isNaN(p) || p < 1 ? 1 : p);
        this.pageSize.set(isNaN(ps) || ps < 1 ? 100 : ps);

        if (bid) {
          this.batchesService.getBatch(bid.toString()).subscribe({
            next: (resp) => {
              this.batch.set(resp);

              this.breadcrumbs.setBatch(resp.batch_id, resp.name);
              this.breadcrumbs.clearBook();
            },
            error: (err) => {
              this.error.set(
                this.translate.instant(
                  'messages.error.batches.batch_detail_load',
                ),
              );
              console.error(err);

              this.breadcrumbs.setBatch(bid, null);
              this.breadcrumbs.clearBook();
            },
          });
        } else {
          this.batch.set(null);
          this.breadcrumbs.clearBatch();
        }

        this.load();
      });
  }

  ngOnDestroy() {
    this.breadcrumbs.clearBook();
  }

  setSort(column: 'created_at' | 'modified_at') {
    if (this.sortBy() === column) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortBy.set(column);
    this.sortDir.set('desc');
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.books
      .listBooks({
        page: this.page(),
        page_size: this.pageSize(),
        batch_id: this.batchId()!.toString(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          this.data.set(resp);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(
            this.translate.instant('messages.error.books.list_load'),
          );
          console.error(err);
          this.loading.set(false);
        },
      });
  }

  goPrev() {
    if (!this.data() || !this.data()!.has_prev) return;
    const prevPage = Math.max(1, this.page() - 1);
    this.page.set(prevPage);
    this.navigateWithQuery({ page: prevPage });
  }

  goNext() {
    if (!this.data() || !this.data()!.has_next) return;
    const nextPage = this.page() + 1;
    this.page.set(nextPage);
    this.navigateWithQuery({ page: nextPage });
  }

  navigateWithQuery(partial: { page?: number; page_size?: number }) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: this.page(),
        page_size: this.pageSize(),
        ...partial,
      },
      queryParamsHandling: 'merge',
    });
  }

  processStateBadgeClass(state?: ProcessState | null) {
    switch (state) {
      case 'created':
        return 'bg-slate-100 text-slate-700';
      case 'scheduled':
        return 'bg-indigo-100 text-indigo-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'ready':
        return 'bg-amber-100 text-amber-800';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  recordStateBadgeClass(state?: RecordState | null) {
    switch (state) {
      case 'new':
        return 'bg-slate-100 text-slate-700';
      case 'edited':
        return 'bg-blue-100 text-blue-700';
      case 'reviewed':
        return 'bg-amber-100 text-amber-800';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  open(book: PaginatedBooksResponseDto['books'][number]) {
    const bid = this.batchId();

    if (!bid) {
      this.router.navigate(['/batches']);
      return;
    }

    const batch = this.batch();
    this.breadcrumbs.setBatch(bid, batch?.name ?? null);
    this.breadcrumbs.setBook(book.book_id, book.title ?? String(book.book_id));

    this.router.navigate([
      '/batches',
      bid.toString(),
      'books',
      book.book_id.toString(),
    ]);
    this.cps.setMode('records');
  }

  onUploadImages(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);

    this.isUploading = true;

    this.books.uploadImages(files, this.batchId()?.toString()!).subscribe({
      next: () => {
        this.toast.show(
          this.translate.instant('messages.success.books.images_upload'),
          'success',
        );
        this.load();
      },
      error: () => {
        this.toast.show(
          this.translate.instant('messages.error.books.images_upload'),
          'error',
        );
        this.isUploading = false;
        input.value = '';
      },
      complete: () => {
        this.isUploading = false;
        input.value = '';
      },
    });
  }

  onDelete(id: ID, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    const confirmed = confirm(
      this.translate.instant('messages.confirm.books.delete'),
    );
    if (!confirmed) return;

    this.books.deleteBookRecord(id.toString()).subscribe({
      next: () => {
        this.toast.show(
          this.translate.instant('messages.success.books.delete'),
          'success',
        );
        this.bookImageCacheService.clearBook(String(id));
        this.load();
      },
      error: (err) => {
        console.error(err);
        this.toast.show(
          this.translate.instant('messages.error.books.delete'),
          'error',
        );
      },
    });
  }

  onRerun(id: ID, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    const confirmed = confirm(
      this.translate.instant('messages.confirm.books.rerun'),
    );
    if (!confirmed) return;

    this.books.rerunBookWorkflow(id.toString()).subscribe({
      next: (resp) => {
        this.patchBookRow(id, resp);
        this.toast.show(
          this.translate.instant('messages.success.books.rerun'),
          'success',
        );
      },
      error: (err) => {
        console.error(err);
        this.toast.show(
          this.translate.instant('messages.error.books.rerun'),
          'error',
        );
      },
    });
  }

  private patchBookRow(
    bookId: ID,
    patch: Partial<PaginatedBooksResponseDto['books'][number]>,
  ) {
    const d = this.data();
    if (!d) return;

    this.data.set({
      ...d,
      books: d.books.map((b) =>
        b.book_id === bookId ? { ...b, ...patch } : b,
      ),
    });
  }
}
