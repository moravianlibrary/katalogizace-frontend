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
import { BreadcrumbsService } from '@/app/services/breadcrumbs.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BatchStateLabelPipe } from '../../pipes/batch-state-label.pipe';
import { BatchesService } from '../../services/api/batches.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../icon/icon.component';

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

  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<PaginatedBatchesResponseDto | null>(null);

  sortBy = signal<'created_at' | 'modified_at'>('modified_at');
  sortDir = signal<'asc' | 'desc'>('desc');

  inputDisabled = signal(false);

  filterMine = signal(false);

  page = signal<number>(1);
  pageSize = signal<number>(100);

  searchInput = signal('');
  searchQuery = signal('');

  newName = signal('');
  newDescription = signal('');
  creating = signal(false);

  editingBatch = signal<BatchDto | null>(null);
  editName = signal('');
  editDescription = signal('');
  savingEdit = signal(false);

  stateFilterOpen = signal(false);
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

  edited = computed(() => {
    const batch = this.editingBatch();
    if (!batch) return false;

    return (
      this.editName().trim() !== (batch.name ?? '').trim() ||
      this.editDescription().trim() !== (batch.description ?? '').trim()
    );
  });

  rows = computed<BatchDto[]>(() => {
    return this.data()?.batches ?? [];
  });

  readonly batchStateOptions: {
    value: BatchState | null;
  }[] = [
    { value: null },
    { value: 'created' },
    { value: 'in_progress' },
    { value: 'completed' },
  ];

  @ViewChild('editDialog', { static: true })
  editDialog!: ElementRef<HTMLDialogElement>;

  @ViewChild('createDialog', { static: true })
  createDialog!: ElementRef<HTMLDialogElement>;

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

  onSearchInput(event: Event) {
    this.searchInput.set((event.target as HTMLInputElement).value);
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

  toggleStateFilter(event?: MouseEvent) {
    event?.stopPropagation();
    this.stateFilterOpen.update((v) => !v);
  }

  setBatchStateFilter(state: BatchState | null) {
    this.batchState.set(state);
    this.stateFilterOpen.set(false);

    this.navigateWithQuery({
      page: 1,
      state,
    });
  }

  closeStateFilter() {
    this.stateFilterOpen.set(false);
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
    this.router.navigate(['/batches', batchId.toString(), 'books']);
  }

  onDelete(batchId: ID, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    const confirmed = confirm(
      this.translate.instant('messages.confirm.batches.delete'),
    );
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
    const name = this.newName().trim();
    const description = this.newDescription().trim();

    if (!name || this.creating()) {
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

        this.router.navigate(['/batches', batch.batch_id.toString(), 'books']);
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

  batchStateBadgeClass(state?: BatchState | null) {
    switch (state) {
      case 'created':
        return 'bg-slate-100 text-slate-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  onEditNameInput(event: Event) {
    this.editName.set((event.target as HTMLInputElement).value);
  }

  onEditDescriptionInput(event: Event) {
    this.editDescription.set((event.target as HTMLInputElement).value);
  }

  openEdit(b: BatchDto, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    this.editingBatch.set(b);
    this.editName.set((b.name ?? '').trim());
    this.editDescription.set((b.description ?? '').trim());

    this.editDialog.nativeElement.showModal();
  }

  closeEdit() {
    if (this.editDialog?.nativeElement.open) {
      this.editDialog.nativeElement.close();
    }

    this.editingBatch.set(null);
    this.editName.set('');
    this.editDescription.set('');
    this.savingEdit.set(false);
  }

  saveEdit() {
    const b = this.editingBatch();
    if (!b || this.savingEdit()) return;

    const name = this.editName().trim();
    const descRaw = this.editDescription().trim();
    const description: string | null = descRaw ? descRaw : null;

    if (!name) {
      this.toast.show(
        this.translate.instant('messages.warning.batches.edit_empty_name'),
        'warning',
      );
      return;
    }

    this.savingEdit.set(true);

    this.batches
      .updateBatch(b.batch_id.toString(), {
        name,
        description,
        state: b.state,
      })
      .subscribe({
        next: () => {
          this.toast.show(
            this.translate.instant('messages.success.batches.edit'),
            'success',
          );
          this.closeEdit();
          this.load();
        },
        error: (err) => {
          console.error(err);
          this.toast.show(
            this.translate.instant('messages.error.batches.save'),
            'error',
          );
          this.savingEdit.set(false);
        },
      });
  }

  openCreate() {
    this.newName.set('');
    this.newDescription.set('');
    this.createDialog.nativeElement.showModal();
  }

  closeCreate() {
    if (this.createDialog?.nativeElement.open) {
      this.createDialog.nativeElement.close();
    }

    this.newName.set('');
    this.newDescription.set('');
    this.creating.set(false);
  }
}
