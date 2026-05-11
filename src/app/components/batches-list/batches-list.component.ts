import { DatePipe, NgClass } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  QueryList,
  signal,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  Observable,
  of,
  switchMap,
} from 'rxjs';

import {
  BatchDto,
  BatchMemberPermissionRequest,
  BatchState,
  EditableBatchMember,
  ID,
  PaginatedBatchesResponseDto,
  Permission,
  UserInfoDto,
} from '@/app/models';
import { AppIconName } from '@/app/models/shared/icon.model';
import { AuthService } from '@/app/services/api/auth.service';
import { UsersService } from '@/app/services/api/users.service';
import { BreadcrumbsService } from '@/app/services/breadcrumbs.service';
import { ConfirmDialogService } from '@/app/services/confirm-dialog.service';
import { PermissionsService } from '@/app/services/permissions.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BatchStateLabelPipe } from '../../pipes/batch-state-label.pipe';
import { BatchesService } from '../../services/api/batches.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../icon/icon.component';
import {
  TableFilterMenuComponent,
  type TableFilterOption,
} from '../shared/table-filter-menu/table-filter-menu.component';

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
    TableFilterMenuComponent,
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
  private users = inject(UsersService);
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
  editName = signal('');
  editDescription = signal('');
  savingEdit = signal(false);
  editDialogOpen = signal(false);

  editMembers = signal<EditableBatchMember[]>([]);
  originalEditMembers = signal<BatchMemberPermissionRequest[]>([]);

  allUsers = signal<UserInfoDto[]>([]);
  loadingUsersInfo = signal(false);
  loadingBatchMembers = signal(false);

  userSearchInput = signal('');
  userPickerOpen = signal(false);
  selectedUserId = signal<number | null>(null);

  userActiveIndex = signal(0);

  @ViewChildren('userOption')
  userOptions!: QueryList<ElementRef<HTMLButtonElement>>;

  readonly permissionOptions: {
    value: Permission;
    icon: AppIconName;
  }[] = [
    { value: 'read', icon: 'book' },
    { value: 'write', icon: 'edit' },
    { value: 'delete', icon: 'trash' },
    { value: 'export', icon: 'export' },
    { value: 'edit', icon: 'settings' },
  ];

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

    const metadataChanged =
      this.editName().trim() !== (batch.name ?? '').trim() ||
      this.editDescription().trim() !== (batch.description ?? '').trim();

    const membersChanged = !this.memberPermissionListsEqual(
      this.effectiveEditMembers(),
      this.originalEditMembers(),
    );

    return metadataChanged || membersChanged;
  });

  readonly selectedUser = computed(() => {
    const selectedId = this.selectedUserId();
    if (selectedId == null) return null;

    return this.allUsers().find((user) => user.id === selectedId) ?? null;
  });

  readonly availableUsers = computed(() => {
    const q = this.userSearchInput().trim().toLowerCase();
    const selectedIds = new Set(this.editMembers().map((m) => m.user_id));

    return this.allUsers()
      .filter((user) => !selectedIds.has(user.id))
      .filter((user) => {
        if (!q) return true;

        return (
          user.full_name.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  });

  readonly editMemberRows = computed(() => this.editMembers());

  rows = computed<BatchDto[]>(() => {
    return this.data()?.batches ?? [];
  });

  readonly batchStateOptions: TableFilterOption[] = [
    { value: null, labelKey: 'labels.batchState.all' },
    { value: 'created', labelKey: 'labels.batchState.created' },
    { value: 'in_progress', labelKey: 'labels.batchState.in_progress' },
    { value: 'completed', labelKey: 'labels.batchState.completed' },
  ];

  @ViewChild('editNameInput')
  editNameInput?: ElementRef<HTMLInputElement>;

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

  onEditNameInput(event: Event) {
    this.editName.set((event.target as HTMLInputElement).value);
  }

  onEditDescriptionInput(event: Event) {
    this.editDescription.set((event.target as HTMLInputElement).value);
  }

  openEdit(b: BatchDto, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.canEditBatch(b.batch_id)) {
      this.showForbidden();
      return;
    }

    this.editingBatch.set(b);
    this.editName.set((b.name ?? '').trim());
    this.editDescription.set((b.description ?? '').trim());

    this.editMembers.set([]);
    this.originalEditMembers.set([]);

    this.userSearchInput.set('');
    this.selectedUserId.set(null);
    this.userPickerOpen.set(false);

    this.loadUsersInfo(true);
    this.loadBatchMembers(b.batch_id);

    this.editDialogOpen.set(true);

    setTimeout(() => {
      this.editNameInput?.nativeElement.focus();
    });
  }

  closeEdit() {
    this.editDialogOpen.set(false);

    this.editingBatch.set(null);
    this.editName.set('');
    this.editDescription.set('');
    this.editMembers.set([]);
    this.originalEditMembers.set([]);

    this.userSearchInput.set('');
    this.selectedUserId.set(null);
    this.userPickerOpen.set(false);

    this.savingEdit.set(false);
  }

  onEditEscape() {
    if (!this.editDialogOpen()) return;

    if (this.userPickerOpen()) {
      this.closeUserPicker();
      return;
    }

    this.closeEdit();
  }

  saveEdit() {
    const b = this.editingBatch();
    if (!b || this.savingEdit()) return;

    if (!this.canEditBatch(b.batch_id)) {
      this.showForbidden();
      return;
    }

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
      .pipe(switchMap(() => this.syncBatchMembers(b.batch_id)))
      .subscribe({
        next: () => {
          this.toast.show(
            this.translate.instant('messages.success.batches.edit'),
            'success',
          );

          this.closeEdit();
          this.load();
          this.auth.loadCurrentUser().subscribe({
            error: (err) => {
              console.error(err);
              this.toast.show(
                this.translate.instant('messages.error.auth.user_load'),
                'error',
              );
            },
          });
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

  private loadUsersInfo(force = false) {
    if (!force && (this.allUsers().length > 0 || this.loadingUsersInfo())) {
      return;
    }

    this.loadingUsersInfo.set(true);

    this.users
      .listUsers('basic')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.allUsers.set(users);
          this.loadingUsersInfo.set(false);
        },
        error: (err) => {
          console.error(err);
          this.loadingUsersInfo.set(false);
          this.toast.show(
            this.translate.instant('messages.error.users.load'),
            'error',
          );
        },
      });
  }

  private loadBatchMembers(batchId: number) {
    this.loadingBatchMembers.set(true);

    this.batches
      .getBatchMembers(batchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (members) => {
          const editMembers: EditableBatchMember[] = members
            .filter((member) => member.permissions.length > 0)
            .map((member) => ({
              user_id: member.id,
              full_name: member.full_name,
              email: member.email,
              role: member.role,
              permissions: [...member.permissions],
            }));

          this.editMembers.set(editMembers);

          this.originalEditMembers.set(
            editMembers.map((member) => ({
              user_id: member.user_id,
              permissions: [...member.permissions],
            })),
          );

          this.loadingBatchMembers.set(false);
        },
        error: (err) => {
          console.error(err);
          this.loadingBatchMembers.set(false);
          this.toast.show(
            this.translate.instant('messages.error.batches.members_load'),
            'error',
          );
        },
      });
  }

  closeUserPicker() {
    this.userPickerOpen.set(false);
    this.restoreSelectedUserInput();
  }

  private restoreSelectedUserInput() {
    const user = this.selectedUser();
    if (!user) return;

    if (!this.userSearchInput().trim()) {
      this.userSearchInput.set(user.full_name);
    }
  }

  onUserSearchFocus() {
    this.openUserPicker();

    if (this.selectedUser()) {
      this.userSearchInput.set('');
    }
  }

  onUserSearchInput(event: Event) {
    this.userSearchInput.set((event.target as HTMLInputElement).value);
    this.selectedUserId.set(null);
    this.userActiveIndex.set(0);
    this.userPickerOpen.set(true);
  }

  toggleUserPicker() {
    if (this.savingEdit()) return;

    if (this.userPickerOpen()) {
      this.closeUserPicker();
      return;
    }

    this.openUserPicker();

    if (this.selectedUser()) {
      this.userSearchInput.set('');
    }
  }

  openUserPicker() {
    if (this.savingEdit()) return;

    this.loadUsersInfo();
    this.userPickerOpen.set(true);
  }

  selectUser(user: UserInfoDto) {
    this.selectedUserId.set(user.id);
    this.userSearchInput.set(user.full_name);
    this.userActiveIndex.set(0);
    this.userPickerOpen.set(false);
  }

  addSelectedUser() {
    const user = this.selectedUser();
    if (!user) return;

    this.editMembers.update((items) => {
      if (items.some((item) => item.user_id === user.id)) {
        return items;
      }

      return [
        {
          user_id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          permissions: ['read'],
        },
        ...items,
      ];
    });

    this.userSearchInput.set('');
    this.selectedUserId.set(null);
    this.userActiveIndex.set(0);
    this.userPickerOpen.set(false);
  }

  removeEditMember(userId: number) {
    this.editMembers.update((items) =>
      items.filter((item) => item.user_id !== userId),
    );
  }

  removeAllEditMembers() {
    this.editMembers.set([]);

    this.userSearchInput.set('');
    this.selectedUserId.set(null);
    this.userPickerOpen.set(false);
  }

  hasEditMemberPermission(userId: number, permission: Permission): boolean {
    return (
      this.editMembers()
        .find((item) => item.user_id === userId)
        ?.permissions.includes(permission) ?? false
    );
  }

  toggleEditMemberPermission(
    userId: number,
    permission: Permission,
    event: Event,
  ) {
    const checked = (event.target as HTMLInputElement).checked;

    this.editMembers.update((items) =>
      items.map((item) => {
        if (item.user_id !== userId) return item;

        const permissions = checked
          ? Array.from(new Set([...item.permissions, permission]))
          : item.permissions.filter((p) => p !== permission);

        return {
          ...item,
          permissions,
        };
      }),
    );
  }

  private effectiveEditMembers(): BatchMemberPermissionRequest[] {
    return this.editMembers()
      .filter((item) => item.permissions.length > 0)
      .map((item) => ({
        user_id: item.user_id,
        permissions: this.normalizePermissions(item.permissions),
      }));
  }

  private syncBatchMembers(batchId: number): Observable<unknown> {
    const original = this.originalEditMembers();
    const current = this.effectiveEditMembers();

    const originalMap = new Map(original.map((item) => [item.user_id, item]));
    const currentMap = new Map(current.map((item) => [item.user_id, item]));

    const toAdd = current.filter((item) => !originalMap.has(item.user_id));

    const toUpdate = current.filter((item) => {
      const originalItem = originalMap.get(item.user_id);
      if (!originalItem) return false;

      return !this.permissionsEqual(item.permissions, originalItem.permissions);
    });

    const toDelete = original
      .filter((item) => !currentMap.has(item.user_id))
      .map((item) => item.user_id);

    const requests: Observable<unknown>[] = [];

    if (toAdd.length > 0) {
      requests.push(this.batches.addBatchMembers(batchId, toAdd));
    }

    if (toUpdate.length > 0) {
      requests.push(this.batches.updateBatchMembers(batchId, toUpdate));
    }

    if (toDelete.length > 0) {
      requests.push(this.batches.deleteBatchMembers(batchId, toDelete));
    }

    return requests.length > 0 ? forkJoin(requests) : of(null);
  }

  private normalizePermissions(permissions: Permission[]): Permission[] {
    return Array.from(new Set(permissions)).sort() as Permission[];
  }

  private permissionsEqual(a: Permission[], b: Permission[]): boolean {
    const left = this.normalizePermissions(a);
    const right = this.normalizePermissions(b);

    return (
      left.length === right.length &&
      left.every((permission, index) => permission === right[index])
    );
  }

  private memberPermissionListsEqual(
    a: BatchMemberPermissionRequest[],
    b: BatchMemberPermissionRequest[],
  ): boolean {
    const normalize = (items: BatchMemberPermissionRequest[]) =>
      items
        .filter((item) => item.permissions.length > 0)
        .map((item) => ({
          user_id: item.user_id,
          permissions: this.normalizePermissions(item.permissions),
        }))
        .sort((x, y) => x.user_id - y.user_id);

    const left = normalize(a);
    const right = normalize(b);

    if (left.length !== right.length) return false;

    return left.every((item, index) => {
      const other = right[index];

      return (
        item.user_id === other.user_id &&
        this.permissionsEqual(item.permissions, other.permissions)
      );
    });
  }

  onUserPickerKeydown(event: KeyboardEvent) {
    if (this.savingEdit()) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      const wasOpen = this.userPickerOpen();
      this.openUserPicker();

      if (wasOpen) {
        this.moveUserActiveIndex(1);
      } else {
        this.userActiveIndex.set(0);
      }

      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      const wasOpen = this.userPickerOpen();
      this.openUserPicker();

      if (wasOpen) {
        this.moveUserActiveIndex(-1);
      } else {
        this.userActiveIndex.set(Math.max(0, this.availableUsers().length - 1));
      }

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      if (this.userPickerOpen()) {
        this.selectActiveUser();
        return;
      }

      if (this.selectedUser()) {
        this.addSelectedUser();
      }

      return;
    }

    if (event.key === 'Escape' && this.userPickerOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.closeUserPicker();
    }
  }

  private moveUserActiveIndex(direction: 1 | -1) {
    const count = this.availableUsers().length;
    if (count === 0) return;

    this.userActiveIndex.update((index) => {
      return (index + direction + count) % count;
    });

    this.scrollActiveUserIntoView();
  }

  private scrollActiveUserIntoView() {
    requestAnimationFrame(() => {
      this.userOptions
        ?.get(this.userActiveIndex())
        ?.nativeElement.scrollIntoView({
          block: 'nearest',
        });
    });
  }

  private selectActiveUser() {
    const user = this.availableUsers()[this.userActiveIndex()];
    if (!user) return;

    this.selectUser(user);
  }
}
