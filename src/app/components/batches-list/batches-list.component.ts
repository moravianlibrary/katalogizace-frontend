import { DatePipe, NgClass } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';

import {
  BatchDto,
  BatchState,
  ID,
  PaginatedBatchesResponseDto,
} from '@/app/models';
import { AuthService } from '@/app/services/api/auth.service';
import { BreadcrumbsService } from '@/app/services/breadcrumbs.service';
import { ConfirmDialogService } from '@/app/services/confirm-dialog.service';
import { PermissionsService } from '@/app/services/permissions.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BatchStateLabelPipe } from '../../pipes/batch-state-label.pipe';
import { BatchesService } from '../../services/api/batches.service';
import { ToastService } from '../../services/toast.service';
import { BatchEditDialogComponent } from '../dialogs/batch-edit-dialog/batch-edit-dialog.component';
import { IconComponent } from '../icon/icon.component';
import {
  TableFilterMenuComponent,
  type TableFilterOption,
} from '../shared/table-filter-menu/table-filter-menu.component';
import { TablePaginationComponent } from '../shared/table-pagination/table-pagination.component';
import { TableSearchInputComponent } from '../shared/table-search-input/table-search-input.component';

type VisiblePageItem = number | 'ellipsis-left' | 'ellipsis-right';

@Component({
  standalone: true,
  selector: 'app-batches-list',
  imports: [
    DatePipe,
    RouterModule,
    NgClass,
    BatchStateLabelPipe,
    TranslateModule,
    IconComponent,
    BatchEditDialogComponent,
    TableFilterMenuComponent,
    TablePaginationComponent,
    TableSearchInputComponent,
  ],
  templateUrl: './batches-list.component.html',
})
export class BatchesListComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private batches = inject(BatchesService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);
  private breadcrumbs = inject(BreadcrumbsService);
  private translate = inject(TranslateService);
  private permissions = inject(PermissionsService);
  private auth = inject(AuthService);
  private confirmDialog = inject(ConfirmDialogService);

  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<PaginatedBatchesResponseDto | null>(null);

  sortBy = signal<'created_at' | 'modified_at'>('modified_at');
  sortDir = signal<'asc' | 'desc'>('desc');

  filterMine = signal(false);

  page = signal<number>(1);
  pageSize = signal<number>(100);

  searchInput = signal('');
  searchQuery = signal('');

  newName = signal('');
  newDescription = signal('');
  creating = signal(false);
  createDialogOpen = signal(false);

  editingBatch = signal<BatchDto | null>(null);
  editDialogOpen = signal(false);

  batchState = signal<BatchState | null>(null);

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

  rows = computed<BatchDto[]>(() => {
    return this.data()?.batches ?? [];
  });

  readonly batchStateOptions: TableFilterOption[] = [
    { value: null, labelKey: 'labels.batchState.all' },
    { value: 'created', labelKey: 'labels.batchState.created' },
    { value: 'in_progress', labelKey: 'labels.batchState.in_progress' },
    { value: 'completed', labelKey: 'labels.batchState.completed' },
  ];

  @ViewChild('createNameInput')
  createNameInput?: ElementRef<HTMLInputElement>;

  ngOnInit() {
    this.breadcrumbs.clearBatch();
  }

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([_, qp]) => {
        const p = Number(qp.get('page') ?? '1');
        const ps = Number(qp.get('page_size') ?? '100');
        const search = (qp.get('search') ?? '').trim();

        const sortByParam = qp.get('sort_by');
        const sortOrderParam = qp.get('sort_order');

        const normalizedSortBy =
          sortByParam === 'created_at' ? 'created_at' : 'modified_at';
        const normalizedSortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

        const stateParam = qp.get('state');
        const normalizedBatchState: BatchState | null =
          stateParam === 'created' ||
          stateParam === 'in_progress' ||
          stateParam === 'completed'
            ? stateParam
            : null;

        const normalizedPageSize = isNaN(ps)
          ? 100
          : Math.min(100, Math.max(1, ps));

        this.page.set(isNaN(p) || p < 1 ? 1 : p);
        this.pageSize.set(normalizedPageSize);
        this.searchQuery.set(search);
        this.sortBy.set(normalizedSortBy);
        this.sortDir.set(normalizedSortOrder);
        this.batchState.set(normalizedBatchState);

        const mine = qp.get('mine');
        this.filterMine.set(mine === '1' || mine === 'true');

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

  protected canCreateBatch(): boolean {
    return this.permissions.canCreateBatch();
  }

  protected canOpenBatch(batchId: ID): boolean {
    return this.permissions.canRead(batchId);
  }

  protected canEditBatch(batchId: ID): boolean {
    return this.permissions.canManageBatch(batchId);
  }

  protected canDeleteBatch(batchId: ID): boolean {
    return this.permissions.canDeleteBatch(batchId);
  }

  private showForbidden() {
    this.toast.show(
      this.translate.instant('messages.error.forbidden'),
      'error',
    );
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
    this.loading.set(true);
    this.error.set(null);

    this.batches
      .listBatches({
        filter_owned_by_user: this.filterMine(),
        page: this.page(),
        page_size: this.pageSize(),
        search_query: this.searchQuery(),
        sort_by: this.sortBy(),
        sort_order: this.sortDir(),
        batch_state: this.batchState(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          this.data.set(resp);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.loading.set(false);
          this.error.set(this.translate.instant('messages.error.batches.load'));
          this.toast.show(
            this.translate.instant('messages.error.batches.load'),
            'error',
          );
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

  navigateWithQuery(partial: {
    page?: number;
    page_size?: number;
    mine?: string;
    search?: string | null;
    sort_by?: 'created_at' | 'modified_at';
    sort_order?: 'asc' | 'desc';
    state?: BatchState | null;
  }) {
    const search =
      partial.search !== undefined ? partial.search : this.searchQuery();

    const state =
      partial.state !== undefined ? partial.state : this.batchState();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: partial.page ?? this.page(),
        page_size: partial.page_size ?? this.pageSize(),
        mine: partial.mine ?? (this.filterMine() ? '1' : '0'),
        search: search || null,
        sort_by: partial.sort_by ?? this.sortBy(),
        sort_order: partial.sort_order ?? this.sortDir(),
        state: state || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  setBatchStateFilter(state: string | null) {
    this.batchState.set(state as BatchState | null);

    this.navigateWithQuery({
      page: 1,
      state: state as BatchState | null,
    });
  }

  setMine(value: boolean) {
    if (this.filterMine() === value) return;

    this.filterMine.set(value);

    this.navigateWithQuery({
      page: 1,
      mine: value ? '1' : '0',
    });
  }

  open(batchId: ID) {
    if (!this.canOpenBatch(batchId)) {
      this.router.navigateByUrl('/forbidden');
      return;
    }

    this.router.navigate(['/batches', batchId.toString(), 'books']);
  }

  async onDelete(batchId: ID, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.canDeleteBatch(batchId)) {
      this.showForbidden();
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: this.translate.instant('messages.confirm.batches.delete_title'),
      note: this.translate.instant('messages.confirm.batches.delete_note'),
      confirmLabel: this.translate.instant('buttons.delete_permanently'),
      confirmKind: 'error',
    });

    if (!confirmed) return;

    this.batches.deleteBatch(batchId.toString()).subscribe({
      next: () => {
        this.toast.show(
          this.translate.instant('messages.success.batches.delete'),
          'success',
        );
        this.load();
      },
      error: (err) => {
        console.error(err);
        this.toast.show(
          this.translate.instant('messages.error.batches.delete'),
          'error',
        );
      },
    });
  }

  onNameInput(event: Event) {
    this.newName.set((event.target as HTMLInputElement).value);
  }

  onDescriptionInput(event: Event) {
    this.newDescription.set((event.target as HTMLInputElement).value);
  }

  createBatch() {
    if (this.creating()) return;

    if (!this.canCreateBatch()) {
      this.showForbidden();
      return;
    }

    const name = this.newName().trim();
    const description = this.newDescription().trim();

    if (!name) {
      this.toast.show(
        this.translate.instant('messages.error.batches.empty_name'),
        'error',
      );
      return;
    }

    this.creating.set(true);

    this.batches.createBatch(name, description ? description : null).subscribe({
      next: (batch) => {
        this.toast.show(
          this.translate.instant('messages.success.batches.create'),
          'success',
        );

        this.closeCreate();

        this.auth.loadCurrentUser().subscribe({
          next: () => {
            this.router.navigate([
              '/batches',
              batch.batch_id.toString(),
              'books',
            ]);
          },
          error: (err) => {
            console.error(err);

            this.toast.show(
              this.translate.instant('messages.error.auth.user_load'),
              'error',
            );

            this.router.navigate(['/batches']);
          },
        });
      },
      error: (err) => {
        console.error(err);
        this.toast.show(
          this.translate.instant('messages.error.batches.create'),
          'error',
        );
        this.creating.set(false);
      },
    });
  }

  batchStateBadgeClass(state: BatchState) {
    switch (state) {
      case 'created':
        return 'bg-cyan-500/10 text-[#011934]';
      case 'in_progress':
        return 'bg-orange-500/10 text-[#362000]';
      case 'completed':
        return 'bg-green-500/10 text-[#00310D]';
    }
  }

  batchStateBadgeIconClass(state: BatchState) {
    switch (state) {
      case 'created':
        return 'icon-link';
      case 'in_progress':
        return 'icon-warning';
      case 'completed':
        return 'icon-success';
    }
  }

  batchStateBadgeIconName(state: BatchState) {
    switch (state) {
      case 'created':
        return 'document';
      case 'in_progress':
        return 'refresh';
      case 'completed':
        return 'checkCircleEmpty';
    }
  }

  openEdit(b: BatchDto, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.canEditBatch(b.batch_id)) {
      this.showForbidden();
      return;
    }

    this.editingBatch.set(b);
    this.editDialogOpen.set(true);
  }

  closeEdit() {
    this.editDialogOpen.set(false);
    this.editingBatch.set(null);
  }

  openCreate() {
    if (!this.canCreateBatch()) {
      this.showForbidden();
      return;
    }

    this.newName.set('');
    this.newDescription.set('');
    this.creating.set(false);
    this.createDialogOpen.set(true);

    setTimeout(() => {
      this.createNameInput?.nativeElement.focus();
    });
  }

  closeCreate() {
    this.createDialogOpen.set(false);

    this.newName.set('');
    this.newDescription.set('');
    this.creating.set(false);
  }
}
