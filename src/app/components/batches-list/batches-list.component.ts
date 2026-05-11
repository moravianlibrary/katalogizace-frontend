import { DatePipe, NgClass } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

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
import {
  createQuerySyncedTableState,
  type TableSortDirection,
} from '../../utils/table-query-state.util';
import { BatchEditDialogComponent } from '../dialogs/batch-edit-dialog/batch-edit-dialog.component';
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

const BATCH_STATE_BADGE_APPEARANCES = {
  created: {
    containerClass: 'bg-cyan-500/10 text-[#011934]',
    iconClass: 'icon-link',
    iconName: 'document',
  },
  in_progress: {
    containerClass: 'bg-orange-500/10 text-[#362000]',
    iconClass: 'icon-warning',
    iconName: 'refresh',
  },
  completed: {
    containerClass: 'bg-green-500/10 text-[#00310D]',
    iconClass: 'icon-success',
    iconName: 'checkCircleEmpty',
  },
} as const satisfies Record<BatchState, TableStateBadgeAppearance>;

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
    TableStateBadgeComponent,
    TableSearchInputComponent,
    SortableTableHeaderComponent,
  ],
  templateUrl: './batches-list.component.html',
})
export class BatchesListComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private batches = inject(BatchesService);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private toast = inject(ToastService);
  private breadcrumbs = inject(BreadcrumbsService);
  private translate = inject(TranslateService);
  private permissions = inject(PermissionsService);
  private auth = inject(AuthService);
  private confirmDialog = inject(ConfirmDialogService);

  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<PaginatedBatchesResponseDto | null>(null);

  filterMine = signal(false);
  batchState = signal<BatchState | null>(null);

  page = signal(1);
  pageSize = signal(100);
  searchInput = signal('');
  searchQuery = signal('');
  sortBy = signal<'created_at' | 'modified_at'>('modified_at');
  sortDir = signal<TableSortDirection>('desc');

  newName = signal('');
  newDescription = signal('');
  creating = signal(false);
  createDialogOpen = signal(false);

  editingBatch = signal<BatchDto | null>(null);
  editDialogOpen = signal(false);

  rows = computed<BatchDto[]>(() => {
    return this.data()?.batches ?? [];
  });

  readonly batchStateOptions: TableFilterOption[] = [
    { value: null, labelKey: 'labels.batchState.all' },
    { value: 'created', labelKey: 'labels.batchState.created' },
    { value: 'in_progress', labelKey: 'labels.batchState.in_progress' },
    { value: 'completed', labelKey: 'labels.batchState.completed' },
  ];
  readonly batchStateBadgeAppearances = BATCH_STATE_BADGE_APPEARANCES;

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
    parseRouteState: (_, queryParamMap) => {
      const page = Number(queryParamMap.get('page') ?? '1');
      const pageSize = Number(queryParamMap.get('page_size') ?? '100');
      const search = (queryParamMap.get('search') ?? '').trim();

      const sortByParam = queryParamMap.get('sort_by');
      const sortOrderParam = queryParamMap.get('sort_order');
      const stateParam = queryParamMap.get('state');
      const mine = queryParamMap.get('mine');

      return {
        page: isNaN(page) || page < 1 ? 1 : page,
        pageSize: isNaN(pageSize) ? 100 : Math.min(100, Math.max(1, pageSize)),
        search,
        sortBy: sortByParam === 'created_at' ? 'created_at' : 'modified_at',
        sortDir: sortOrderParam === 'asc' ? 'asc' : 'desc',
        extraState: {
          batchState:
            stateParam === 'created' ||
            stateParam === 'in_progress' ||
            stateParam === 'completed'
              ? (stateParam as BatchState)
              : null,
          filterMine: mine === '1' || mine === 'true',
        },
      };
    },
    applyExtraState: ({ batchState, filterMine }) => {
      this.batchState.set(batchState);
      this.filterMine.set(filterMine);
    },
    currentExtraQueryParams: () => ({
      mine: this.filterMine() ? '1' : '0',
      state: this.batchState(),
    }),
    load: () => this.load(),
  });

  totalPages = this.tableState.totalPages;
  from = this.tableState.from;
  to = this.tableState.to;
  hasPrev = this.tableState.hasPrev;
  hasNext = this.tableState.hasNext;
  visiblePages = this.tableState.visiblePages;

  @ViewChild('createNameInput')
  createNameInput?: ElementRef<HTMLInputElement>;

  ngOnInit() {
    this.breadcrumbs.clearBatch();
  }

  constructor() {
    this.tableState.connect();
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
    this.tableState.setSort(column);
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
    mine?: string;
    search?: string | null;
    sort_by?: 'created_at' | 'modified_at';
    sort_order?: 'asc' | 'desc';
    state?: BatchState | null;
  }) {
    this.tableState.navigateWithQuery(partial);
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
