import {
  BatchDto,
  ID,
  PaginatedBooksResponseDto,
  ProcessState,
  RecordState,
} from '@/app/models';
import { BookImageCacheService } from '@/app/services/book-image-cache.service';
import { BreadcrumbsService } from '@/app/services/breadcrumbs.service';
import { ConfirmDialogService } from '@/app/services/confirm-dialog.service';
import { PermissionsService } from '@/app/services/permissions.service';
import { DatePipe, NgClass } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ProcessStateLabelPipe } from '../../pipes/process-state-label.pipe';
import { RecordStateLabelPipe } from '../../pipes/record-state-label.pipe';
import { BatchesService } from '../../services/api/batches.service';
import { BooksService } from '../../services/api/books.service';
import { ContextPanelService } from '../../services/context-panel.service';
import { ToastService } from '../../services/toast.service';
import {
  createQuerySyncedTableState,
  type TableSortDirection,
} from '../../utils/table-query-state.util';
import { IconComponent } from '../icon/icon.component';
import { SortableTableHeaderComponent } from '../shared/sortable-table-header/sortable-table-header.component';
import {
  TableFilterMenuComponent,
  type TableFilterOption,
} from '../shared/table-filter-menu/table-filter-menu.component';
import { TablePaginationComponent } from '../shared/table-pagination/table-pagination.component';
import { TableSearchInputComponent } from '../shared/table-search-input/table-search-input.component';
import {
  type TableStateBadgeAppearance,
  TableStateBadgeComponent,
} from '../shared/table-state-badge/table-state-badge.component';

const PROCESS_STATE_BADGE_APPEARANCES = {
  created: {
    containerClass: 'bg-cyan-500/10 text-[#011934]',
    iconClass: 'icon-link',
    iconName: 'document',
  },
  scheduled: {
    containerClass: 'bg-amber-500/10 text-[#4A3200]',
    iconClass: 'fill-amber-500',
    iconName: 'timer',
  },
  in_progress: {
    containerClass: 'bg-orange-500/10 text-[#362000]',
    iconClass: 'icon-warning',
    iconName: 'refresh',
  },
  ready: {
    containerClass: 'bg-indigo-500/10 text-[#1D185A]',
    iconClass: 'fill-indigo-500',
    iconName: 'clipboardTick',
  },
  failed: {
    containerClass: 'bg-red-500/10 text-[#390400]',
    iconClass: 'icon-error',
    iconName: 'shieldError',
  },
  completed: {
    containerClass: 'bg-green-500/10 text-[#00310D]',
    iconClass: 'icon-success',
    iconName: 'checkCircleEmpty',
  },
} as const satisfies Record<ProcessState, TableStateBadgeAppearance>;

const RECORD_STATE_BADGE_APPEARANCES = {
  new: {
    containerClass: 'bg-cyan-500/10 text-[#011934]',
    iconClass: 'icon-link',
    iconName: 'document',
  },
  edited: {
    containerClass: 'bg-orange-500/10 text-[#362000]',
    iconClass: 'icon-warning',
    iconName: 'editUnderline',
  },
  reviewed: {
    containerClass: 'bg-indigo-500/10 text-[#1D185A]',
    iconClass: 'fill-indigo-500',
    iconName: 'clipboardTick',
  },
  completed: {
    containerClass: 'bg-green-500/10 text-[#00310D]',
    iconClass: 'icon-success',
    iconName: 'checkCircleEmpty',
  },
} as const satisfies Record<RecordState, TableStateBadgeAppearance>;

const DEFAULT_RECORD_STATE_BADGE_APPEARANCE = {
  containerClass: 'bg-slate-100 text-slate-600',
} as const satisfies TableStateBadgeAppearance;

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
    TableFilterMenuComponent,
    TablePaginationComponent,
    TableStateBadgeComponent,
    TableSearchInputComponent,
    SortableTableHeaderComponent,
  ],
  templateUrl: 'books-list.component.html',
})
export class BooksListComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private books = inject(BooksService);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private toast = inject(ToastService);
  private cps = inject(ContextPanelService);
  private batchesService = inject(BatchesService);
  private breadcrumbs = inject(BreadcrumbsService);
  private translate = inject(TranslateService);
  private bookImageCacheService = inject(BookImageCacheService);
  private permissions = inject(PermissionsService);
  private confirmDialog = inject(ConfirmDialogService);

  isUploading = false;

  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  data = signal<PaginatedBooksResponseDto | null>(null);

  batchId = signal<ID | null>(null);
  batch = signal<BatchDto | null>(null);

  page = signal(1);
  pageSize = signal(100);

  searchInput = signal('');
  searchQuery = signal('');

  sortBy = signal<'created_at' | 'modified_at'>('created_at');
  sortDir = signal<TableSortDirection>('desc');

  rows = computed<PaginatedBooksResponseDto['books']>(() => {
    return this.data()?.books ?? [];
  });

  processState = signal<ProcessState | null>(null);
  recordState = signal<RecordState | null>(null);

  readonly processStateOptions: TableFilterOption[] = [
    { value: null, labelKey: 'labels.processState.all' },
    { value: 'created', labelKey: 'labels.processState.created' },
    { value: 'scheduled', labelKey: 'labels.processState.scheduled' },
    { value: 'in_progress', labelKey: 'labels.processState.in_progress' },
    { value: 'ready', labelKey: 'labels.processState.ready' },
    { value: 'failed', labelKey: 'labels.processState.failed' },
    { value: 'completed', labelKey: 'labels.processState.completed' },
  ];

  readonly recordStateOptions: TableFilterOption[] = [
    { value: null, labelKey: 'labels.recordState.all' },
    { value: 'new', labelKey: 'labels.recordState.new' },
    { value: 'edited', labelKey: 'labels.recordState.edited' },
    { value: 'reviewed', labelKey: 'labels.recordState.reviewed' },
    { value: 'completed', labelKey: 'labels.recordState.completed' },
  ];
  readonly processStateBadgeAppearances = PROCESS_STATE_BADGE_APPEARANCES;
  readonly recordStateBadgeAppearances = RECORD_STATE_BADGE_APPEARANCES;
  readonly defaultRecordStateBadgeAppearance =
    DEFAULT_RECORD_STATE_BADGE_APPEARANCE;

  private readonly tableState = createQuerySyncedTableState({
    route: this.route,
    router: this.router,
    destroyRef: this.destroyRef,
    injector: this.injector,
    data: this.data,
    page: this.page,
    pageSize: this.pageSize,
    searchInput: this.searchInput,
    searchQuery: this.searchQuery,
    sortBy: this.sortBy,
    sortDir: this.sortDir,
    parseRouteState: (paramMap, queryParamMap) => {
      const batchIdParam = paramMap.get('batchId');
      const batchId = batchIdParam !== null ? Number(batchIdParam) : null;

      const page = Number(queryParamMap.get('page') ?? '1');
      const pageSize = Number(queryParamMap.get('page_size') ?? '100');
      const search = (queryParamMap.get('search') ?? '').trim();

      const sortByParam = queryParamMap.get('sort_by');
      const sortOrderParam = queryParamMap.get('sort_order');
      const processStateParam = queryParamMap.get('process_state');
      const recordStateParam = queryParamMap.get('record_state');

      return {
        page: isNaN(page) || page < 1 ? 1 : page,
        pageSize: isNaN(pageSize) ? 100 : Math.min(100, Math.max(1, pageSize)),
        search,
        sortBy: sortByParam === 'modified_at' ? 'modified_at' : 'created_at',
        sortDir: sortOrderParam === 'asc' ? 'asc' : 'desc',
        extraState: {
          batchId:
            batchId !== null && !isNaN(batchId) && batchId > 0 ? batchId : null,
          processState:
            processStateParam === 'created' ||
            processStateParam === 'scheduled' ||
            processStateParam === 'in_progress' ||
            processStateParam === 'ready' ||
            processStateParam === 'failed' ||
            processStateParam === 'completed'
              ? (processStateParam as ProcessState)
              : null,
          recordState:
            recordStateParam === 'new' ||
            recordStateParam === 'edited' ||
            recordStateParam === 'reviewed' ||
            recordStateParam === 'completed'
              ? (recordStateParam as RecordState)
              : null,
        },
      };
    },
    applyExtraState: ({ batchId, processState, recordState }) => {
      this.batchId.set(batchId);
      this.processState.set(processState);
      this.recordState.set(recordState);
    },
    currentExtraQueryParams: () => ({
      process_state: this.processState(),
      record_state: this.recordState(),
    }),
    load: () => this.load(),
  });

  totalPages = this.tableState.totalPages;
  from = this.tableState.from;
  to = this.tableState.to;
  hasPrev = this.tableState.hasPrev;
  hasNext = this.tableState.hasNext;
  visiblePages = this.tableState.visiblePages;

  readonly canRead = computed(() => this.permissions.canRead(this.batchId()));
  readonly canWrite = computed(() => this.permissions.canWrite(this.batchId()));
  readonly canDelete = computed(() =>
    this.permissions.canDelete(this.batchId()),
  );

  protected canOpenBook(
    book: PaginatedBooksResponseDto['books'][number],
  ): boolean {
    return this.canRead() && book.process_state === 'completed';
  }

  protected canRerunBook(
    book: PaginatedBooksResponseDto['books'][number],
  ): boolean {
    return (
      this.canWrite() &&
      book.process_state !== 'in_progress' &&
      book.process_state !== 'scheduled'
    );
  }

  private showForbidden() {
    this.toast.show(
      this.translate.instant('messages.error.forbidden'),
      'error',
    );
  }

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((pm) => {
      const bidParam = pm.get('batchId');
      const bid = bidParam !== null ? Number(bidParam) : null;
      const normalizedBatchId =
        bid !== null && Number.isFinite(bid) && bid > 0 ? bid : null;

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

    this.tableState.connect();
  }

  ngOnDestroy() {
    this.breadcrumbs.clearBook();
  }

  setSort(column: 'created_at' | 'modified_at') {
    this.tableState.setSort(column);
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
    this.tableState.goToPage(page);
  }

  goPrevPage() {
    this.tableState.goPrevPage();
  }

  goNextPage() {
    this.tableState.goNextPage();
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
    this.tableState.navigateWithQuery(partial);
  }

  open(book: PaginatedBooksResponseDto['books'][number]) {
    if (!this.canRead()) {
      this.router.navigateByUrl('/forbidden');
      return;
    }

    if (book.process_state !== 'completed') {
      return;
    }

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

    if (!this.canWrite()) {
      this.showForbidden();
      input.value = '';
      return;
    }

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

  async onDelete(id: ID, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.canDelete()) {
      this.showForbidden();
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: this.translate.instant('messages.confirm.books.delete_title'),
      note: this.translate.instant('messages.confirm.books.delete_note'),
      confirmLabel: this.translate.instant('buttons.delete_permanently'),
      confirmKind: 'error',
    });

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

  async onRerun(id: ID, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.canWrite()) {
      this.showForbidden();
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: this.translate.instant('messages.confirm.books.rerun_title'),
      note: this.translate.instant('messages.confirm.books.rerun_note'),
      confirmLabel: this.translate.instant('buttons.rerun'),
      confirmKind: 'primary',
    });

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

  recordStateBadgeAppearance(
    book: PaginatedBooksResponseDto['books'][number],
  ): TableStateBadgeAppearance {
    if (book.process_state !== 'completed') {
      return this.defaultRecordStateBadgeAppearance;
    }

    return this.recordStateBadgeAppearances[book.record_state];
  }

  setProcessStateFilter(state: string | null) {
    this.processState.set(state as ProcessState | null);

    this.navigateWithQuery({
      page: 1,
      process_state: state as ProcessState | null,
    });
  }

  setRecordStateFilter(state: string | null) {
    this.recordState.set(state as RecordState | null);

    this.navigateWithQuery({
      page: 1,
      record_state: state as RecordState | null,
    });
  }
}
