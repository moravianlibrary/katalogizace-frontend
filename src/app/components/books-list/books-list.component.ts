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
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';
import { ProcessStateLabelPipe } from '../../pipes/process-state-label.pipe';
import { RecordStateLabelPipe } from '../../pipes/record-state-label.pipe';
import { BatchesService } from '../../services/api/batches.service';
import { BooksService } from '../../services/api/books.service';
import { ContextPanelService } from '../../services/context-panel.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../icon/icon.component';

type VisiblePageItem = number | 'ellipsis-left' | 'ellipsis-right';

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

  searchInput = signal('');
  searchQuery = signal('');

  sortBy = signal<'created_at' | 'modified_at'>('created_at');
  sortDir = signal<'asc' | 'desc'>('desc');

  processFilterMenuPosition = signal<{ top: number; left: number } | null>(
    null,
  );
  recordFilterMenuPosition = signal<{ top: number; left: number } | null>(null);

  totalPages = computed(() =>
    this.data()
      ? Math.max(1, Math.ceil(this.data()!.total / this.data()!.page_size))
      : 1,
  );

  from = computed(() => {
    const data = this.data();
    if (!data || data.total === 0) return 0;
    return (data.page - 1) * data.page_size + 1;
  });

  to = computed(() => {
    const data = this.data();
    if (!data || data.total === 0) return 0;
    return Math.min(data.page * data.page_size, data.total);
  });

  hasPrev = computed(() => !!this.data()?.has_prev);
  hasNext = computed(() => !!this.data()?.has_next);

  visiblePages = computed<VisiblePageItem[]>(() => {
    const total = this.totalPages();
    const current = this.page();

    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 4, 'ellipsis-right', total];
    }

    if (current >= total - 2) {
      return [1, 'ellipsis-left', total - 3, total - 2, total - 1, total];
    }

    return [
      1,
      'ellipsis-left',
      current - 1,
      current,
      current + 1,
      'ellipsis-right',
      total,
    ];
  });

  rows = computed<PaginatedBooksResponseDto['books']>(() => {
    return this.data()?.books ?? [];
  });

  processStateFilterOpen = signal(false);
  recordStateFilterOpen = signal(false);

  processState = signal<ProcessState | null>(null);
  recordState = signal<RecordState | null>(null);

  readonly processStateOptions: {
    value: ProcessState | null;
  }[] = [
    { value: null },
    { value: 'created' },
    { value: 'scheduled' },
    { value: 'in_progress' },
    { value: 'ready' },
    { value: 'failed' },
    { value: 'completed' },
  ];

  readonly recordStateOptions: {
    value: RecordState | null;
  }[] = [
    { value: null },
    { value: 'new' },
    { value: 'edited' },
    { value: 'reviewed' },
    { value: 'completed' },
  ];

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((pm) => {
      const bidParam = pm.get('batchId');
      const bid = bidParam !== null ? Number(bidParam) : null;
      const normalizedBatchId =
        bid !== null && !isNaN(bid) && bid > 0 ? bid : null;

      this.batchId.set(normalizedBatchId);

      if (normalizedBatchId) {
        this.batchesService.getBatch(normalizedBatchId.toString()).subscribe({
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

            this.batch.set(null);
            this.breadcrumbs.setBatch(normalizedBatchId, null);
            this.breadcrumbs.clearBook();
          },
        });
      } else {
        this.batch.set(null);
        this.breadcrumbs.clearBatch();
        this.breadcrumbs.clearBook();
      }
    });

    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([pm, qp]) => {
        const bidParam = pm.get('batchId');
        const bid = bidParam !== null ? Number(bidParam) : null;
        const normalizedBatchId =
          bid !== null && !isNaN(bid) && bid > 0 ? bid : null;

        this.batchId.set(normalizedBatchId);

        const p = Number(qp.get('page') ?? '1');
        const ps = Number(qp.get('page_size') ?? '100');
        const search = (qp.get('search') ?? '').trim();

        const sortByParam = qp.get('sort_by');
        const sortOrderParam = qp.get('sort_order');

        const normalizedSortBy =
          sortByParam === 'modified_at' ? 'modified_at' : 'created_at';
        const normalizedSortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

        const normalizedPageSize = isNaN(ps)
          ? 100
          : Math.min(100, Math.max(1, ps));

        const processStateParam = qp.get('process_state');
        const normalizedProcessState: ProcessState | null =
          processStateParam === 'created' ||
          processStateParam === 'scheduled' ||
          processStateParam === 'in_progress' ||
          processStateParam === 'ready' ||
          processStateParam === 'failed' ||
          processStateParam === 'completed'
            ? processStateParam
            : null;

        const recordStateParam = qp.get('record_state');
        const normalizedRecordState: RecordState | null =
          recordStateParam === 'new' ||
          recordStateParam === 'edited' ||
          recordStateParam === 'reviewed' ||
          recordStateParam === 'completed'
            ? recordStateParam
            : null;

        this.page.set(isNaN(p) || p < 1 ? 1 : p);
        this.pageSize.set(normalizedPageSize);
        this.searchQuery.set(search);
        this.sortBy.set(normalizedSortBy);
        this.sortDir.set(normalizedSortOrder);
        this.processState.set(normalizedProcessState);
        this.recordState.set(normalizedRecordState);

        if (this.searchInput() !== search) {
          this.searchInput.set(search);
        }

        this.load();
      });

    toObservable(this.searchInput)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        const normalized = value.trim();

        if (normalized === this.searchQuery()) return;

        this.navigateWithQuery({
          page: 1,
          search: normalized || null,
        });
      });
  }

  ngOnDestroy() {
    this.breadcrumbs.clearBook();
  }

  setSort(column: 'created_at' | 'modified_at') {
    const nextDir =
      this.sortBy() === column
        ? this.sortDir() === 'asc'
          ? 'desc'
          : 'asc'
        : 'desc';

    this.navigateWithQuery({
      page: 1,
      sort_by: column,
      sort_order: nextDir,
    });
  }

  load() {
    const batchId = this.batchId();

    if (!batchId) {
      this.data.set(null);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.books
      .listBooks({
        page: this.page(),
        page_size: this.pageSize(),
        batch_id: batchId.toString(),
        search_query: this.searchQuery(),
        sort_by: this.sortBy(),
        sort_order: this.sortDir(),
        process_state: this.processState(),
        record_state: this.recordState(),
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

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.navigateWithQuery({ page });
  }

  goPrevPage() {
    if (!this.hasPrev()) return;
    this.navigateWithQuery({ page: this.page() - 1 });
  }

  goNextPage() {
    if (!this.hasNext()) return;
    this.navigateWithQuery({ page: this.page() + 1 });
  }

  onSearchInput(event: Event) {
    this.searchInput.set((event.target as HTMLInputElement).value);
  }

  navigateWithQuery(partial: {
    page?: number;
    page_size?: number;
    search?: string | null;
    sort_by?: 'created_at' | 'modified_at';
    sort_order?: 'asc' | 'desc';
    process_state?: ProcessState | null;
    record_state?: RecordState | null;
  }) {
    const search =
      partial.search !== undefined ? partial.search : this.searchQuery();

    const processState =
      partial.process_state !== undefined
        ? partial.process_state
        : this.processState();

    const recordState =
      partial.record_state !== undefined
        ? partial.record_state
        : this.recordState();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: partial.page ?? this.page(),
        page_size: partial.page_size ?? this.pageSize(),
        search: search || null,
        sort_by: partial.sort_by ?? this.sortBy(),
        sort_order: partial.sort_order ?? this.sortDir(),
        process_state: processState || null,
        record_state: recordState || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  processStateBadgeClass(state: ProcessState) {
    switch (state) {
      case 'created':
        return 'bg-cyan-500/10 text-[#011934]';
      case 'scheduled':
        return 'bg-amber-500/10 text-[#4A3200]';
      case 'in_progress':
        return 'bg-orange-500/10 text-[#362000]';
      case 'ready':
        return 'bg-indigo-500/10 text-[#1D185A]';
      case 'failed':
        return 'bg-red-500/10 text-[#390400]';
      case 'completed':
        return 'bg-green-500/10 text-[#00310D]';
    }
  }

  processStateBadgeIconClass(state: ProcessState) {
    switch (state) {
      case 'created':
        return 'icon-link';
      case 'scheduled':
        return 'fill-amber-500';
      case 'in_progress':
        return 'icon-warning';
      case 'ready':
        return 'fill-indigo-500';
      case 'failed':
        return 'icon-error';
      case 'completed':
        return 'icon-success';
    }
  }

  processStateBadgeIconName(state: ProcessState) {
    switch (state) {
      case 'created':
        return 'document';
      case 'scheduled':
        return 'timer';
      case 'in_progress':
        return 'refresh';
      case 'ready':
        return 'clipboardTick';
      case 'failed':
        return 'shieldError';
      case 'completed':
        return 'checkCircleEmpty';
    }
  }

  recordStateBadgeClass(state?: RecordState | null) {
    switch (state) {
      case 'new':
        return 'bg-cyan-500/10 text-[#011934]';
      case 'edited':
        return 'bg-orange-500/10 text-[#362000]';
      case 'reviewed':
        return 'bg-indigo-500/10 text-[#1D185A]';
      case 'completed':
        return 'bg-green-500/10 text-[#00310D]';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  recordStateBadgeIconClass(state: RecordState) {
    switch (state) {
      case 'new':
        return 'icon-link';
      case 'edited':
        return 'icon-warning';
      case 'reviewed':
        return 'fill-indigo-500';
      case 'completed':
        return 'icon-success';
    }
  }

  recordStateBadgeIconName(state: RecordState) {
    switch (state) {
      case 'new':
        return 'document';
      case 'edited':
        return 'editUnderline';
      case 'reviewed':
        return 'clipboardTick';
      case 'completed':
        return 'checkCircleEmpty';
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

    const batchId = this.batchId();
    if (!batchId) return;

    const files = Array.from(input.files);

    this.isUploading = true;

    this.books.uploadImages(files, batchId.toString()).subscribe({
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

  toggleProcessStateFilter(event: MouseEvent) {
    event.stopPropagation();

    if (this.processStateFilterOpen()) {
      this.processStateFilterOpen.set(false);
      this.processFilterMenuPosition.set(null);
      return;
    }

    this.recordStateFilterOpen.set(false);
    this.recordFilterMenuPosition.set(null);

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    this.processFilterMenuPosition.set({
      top: rect.bottom + 8,
      left: rect.left,
    });

    this.processStateFilterOpen.set(true);
  }

  toggleRecordStateFilter(event: MouseEvent) {
    event.stopPropagation();

    if (this.recordStateFilterOpen()) {
      this.recordStateFilterOpen.set(false);
      this.recordFilterMenuPosition.set(null);
      return;
    }

    this.processStateFilterOpen.set(false);
    this.processFilterMenuPosition.set(null);

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    this.recordFilterMenuPosition.set({
      top: rect.bottom + 8,
      left: rect.left,
    });

    this.recordStateFilterOpen.set(true);
  }

  setProcessStateFilter(state: ProcessState | null) {
    this.processState.set(state);
    this.processStateFilterOpen.set(false);

    this.navigateWithQuery({
      page: 1,
      process_state: state,
    });
  }

  setRecordStateFilter(state: RecordState | null) {
    this.recordState.set(state);
    this.recordStateFilterOpen.set(false);

    this.navigateWithQuery({
      page: 1,
      record_state: state,
    });
  }

  closeFilters() {
    this.processStateFilterOpen.set(false);
    this.recordStateFilterOpen.set(false);
    this.processFilterMenuPosition.set(null);
    this.recordFilterMenuPosition.set(null);
  }
}
