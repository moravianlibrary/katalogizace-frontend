import { NgClass } from '@angular/common';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  BatchInfoDto,
  BatchPermissionUpdateDto,
  Permission,
  UserDto,
} from '@/app/models';
import { AppIconName } from '@/app/models/shared/icon.model';
import { AuthService } from '@/app/services/api/auth.service';
import { BatchesService } from '@/app/services/api/batches.service';
import { UsersService } from '@/app/services/api/users.service';
import { BreadcrumbsService } from '@/app/services/breadcrumbs.service';
import { ConfirmDialogService } from '@/app/services/confirm-dialog.service';
import { PermissionsService } from '@/app/services/permissions.service';
import { ToastService } from '@/app/services/toast.service';
import { IconComponent } from '../icon/icon.component';
import { UserBatchesCellComponent } from '../user-batches-cell/user-batches-cell.component';

@Component({
  standalone: true,
  selector: 'app-users-list',
  imports: [NgClass, TranslateModule, IconComponent, UserBatchesCellComponent],
  templateUrl: './users-list.component.html',
})
export class UsersListComponent {
  private users = inject(UsersService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private breadcrumbs = inject(BreadcrumbsService);
  private permissions = inject(PermissionsService);
  private batches = inject(BatchesService);
  private confirmDialog = inject(ConfirmDialogService);
  auth = inject(AuthService);

  loading = signal(false);
  error = signal<string | null>(null);
  usersData = signal<UserDto[]>([]);

  editingUser = signal<UserDto | null>(null);

  searchInput = signal('');

  creating = signal(false);
  newFullName = signal('');
  newEmail = signal('');
  newIsAdmin = signal(false);
  createPermissions = signal<BatchPermissionUpdateDto[]>([]);
  createDialogOpen = signal(false);

  editFullName = signal('');
  savingEdit = signal(false);
  editIsAdmin = signal(false);
  editDialogOpen = signal(false);

  editPermissions = signal<BatchPermissionUpdateDto[]>([]);

  allBatches = signal<BatchInfoDto[]>([]);
  loadingBatchesInfo = signal(false);

  batchSearchInput = signal('');
  batchPickerOpen = signal(false);
  selectedBatchId = signal<number | null>(null);

  batchActiveIndex = signal(0);

  resettingPassword = signal(false);
  generatedPassword = signal('');
  resetPasswordDialogLocked = signal(false);
  resetPasswordDialogOpen = signal(false);
  readonly passwordDialogTitleKey = signal('users.new_password');

  private resetPasswordCloseTimer: ReturnType<typeof setTimeout> | null = null;

  readonly passwordCopied = signal(false);
  private passwordCopiedTimeout: ReturnType<typeof setTimeout> | null = null;

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

  @ViewChild('createFullNameInput')
  createFullNameInput?: ElementRef<HTMLInputElement>;

  @ViewChild('editFullNameInput')
  editFullNameInput?: ElementRef<HTMLInputElement>;

  @ViewChildren('batchOption')
  batchOptions!: QueryList<ElementRef<HTMLButtonElement>>;

  readonly edited = computed(() => {
    const user = this.editingUser();
    if (!user) return false;

    const nameChanged = this.editFullName().trim() !== user.full_name.trim();
    const roleChanged = this.editIsAdmin() !== (user.role === 'admin');

    const originalPermissions = user.batch_permissions.map((batch) => ({
      batch_id: batch.batch_id,
      permissions: batch.permissions,
    }));

    const permissionsChanged = !this.permissionListsEqual(
      this.effectiveEditPermissions(),
      originalPermissions,
    );

    return nameChanged || roleChanged || permissionsChanged;
  });

  readonly selectedBatch = computed(() => {
    const selectedId = this.selectedBatchId();
    if (selectedId == null) return null;

    return (
      this.allBatches().find((batch) => batch.batch_id === selectedId) ?? null
    );
  });

  readonly activePermissions = computed(() => {
    return this.editingUser()
      ? this.editPermissions()
      : this.createPermissions();
  });

  readonly availableBatches = computed(() => {
    const q = this.batchSearchInput().trim().toLowerCase();
    const selectedIds = new Set(
      this.activePermissions().map((p) => p.batch_id),
    );

    return this.allBatches()
      .filter((batch) => !selectedIds.has(batch.batch_id))
      .filter((batch) => {
        if (!q) return true;

        return (
          batch.name.toLowerCase().includes(q) ||
          (batch.description ?? '').toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  });

  closeBatchPicker() {
    this.batchPickerOpen.set(false);
    this.restoreSelectedBatchInput();
  }

  private restoreSelectedBatchInput() {
    const batch = this.selectedBatch();
    if (!batch) return;

    if (!this.batchSearchInput().trim()) {
      this.batchSearchInput.set(batch.name);
    }
  }

  onBatchSearchFocus() {
    this.openBatchPicker();

    if (this.selectedBatch()) {
      this.batchSearchInput.set('');
    }
  }

  private readonly batchPickerDisabled = computed(() => {
    return this.savingEdit() || this.creating();
  });

  toggleBatchPicker() {
    if (this.batchPickerDisabled()) return;

    if (this.batchPickerOpen()) {
      this.closeBatchPicker();
      return;
    }

    this.openBatchPicker();
  }

  readonly batchNameById = computed(() => {
    const map = new Map<number, string>();

    for (const batch of this.allBatches()) {
      map.set(batch.batch_id, batch.name);
    }

    const user = this.editingUser();
    if (user) {
      for (const batch of user.batch_permissions) {
        if (!map.has(batch.batch_id)) {
          map.set(batch.batch_id, batch.batch_name);
        }
      }
    }

    return map;
  });

  readonly editPermissionRows = computed(() => {
    const names = this.batchNameById();

    return this.editPermissions().map((item) => ({
      ...item,
      batch_name: names.get(item.batch_id) ?? `#${item.batch_id}`,
    }));
  });

  readonly createPermissionRows = computed(() => {
    const names = this.batchNameById();

    return this.createPermissions().map((item) => ({
      ...item,
      batch_name: names.get(item.batch_id) ?? `#${item.batch_id}`,
    }));
  });

  readonly canManageUsers = computed(() => this.permissions.canManageUsers());

  ngOnInit() {
    this.breadcrumbs.clearBatch();
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.users
      .listUsers('detail')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.usersData.set(users);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.loading.set(false);
          this.error.set(this.translate.instant('messages.error.users.load'));
          this.toast.show(
            this.translate.instant('messages.error.users.load'),
            'error',
          );
        },
      });
  }

  onSearchInput(event: Event) {
    this.searchInput.set((event.target as HTMLInputElement).value);
  }

  onNewFullNameInput(event: Event) {
    this.newFullName.set((event.target as HTMLInputElement).value);
  }

  onNewEmailInput(event: Event) {
    this.newEmail.set((event.target as HTMLInputElement).value);
  }

  onNewIsAdminInput(event: Event) {
    this.newIsAdmin.set((event.target as HTMLInputElement).checked);
  }

  onEditFullNameInput(event: Event) {
    this.editFullName.set((event.target as HTMLInputElement).value);
  }

  openCreate() {
    if (!this.canManageUsers()) {
      this.showForbidden();
      return;
    }

    this.newFullName.set('');
    this.newEmail.set('');
    this.newIsAdmin.set(false);
    this.createPermissions.set([]);

    this.batchSearchInput.set('');
    this.selectedBatchId.set(null);
    this.batchPickerOpen.set(false);
    this.batchActiveIndex.set(0);

    this.creating.set(false);

    this.loadBatchesInfo(true);
    this.createDialogOpen.set(true);

    setTimeout(() => {
      this.createFullNameInput?.nativeElement.focus();
    });
  }

  closeCreate() {
    this.createDialogOpen.set(false);

    this.newFullName.set('');
    this.newEmail.set('');
    this.newIsAdmin.set(false);
    this.createPermissions.set([]);

    this.batchSearchInput.set('');
    this.selectedBatchId.set(null);
    this.batchPickerOpen.set(false);
    this.batchActiveIndex.set(0);

    this.creating.set(false);
  }

  createUser() {
    if (this.creating()) return;

    if (!this.canManageUsers()) {
      this.showForbidden();
      return;
    }

    const full_name = this.newFullName().trim();
    const email = this.newEmail().trim();

    if (!full_name || !email) {
      this.toast.show(
        this.translate.instant('messages.warning.users.create_required'),
        'warning',
      );
      return;
    }

    this.creating.set(true);

    const batch_permissions = this.effectiveCreatePermissions();

    this.users
      .createUser({
        full_name,
        email,
        permissions: batch_permissions,
      })
      .subscribe({
        next: (createdUser) => {
          const shouldUpdateAfterCreate =
            this.newIsAdmin() || batch_permissions.length > 0;

          if (!shouldUpdateAfterCreate) {
            this.toast.show(
              this.translate.instant('messages.success.users.create'),
              'success',
            );

            this.closeCreate();
            this.load();

            if ('password' in createdUser && createdUser.password) {
              this.generatedPassword.set(createdUser.password);
              this.passwordDialogTitleKey.set('users.new_user');
              this.openResetPasswordDialog();
            }

            return;
          }

          this.users
            .updateUser(createdUser.id, {
              full_name,
              role: this.newIsAdmin() ? 'admin' : 'user',
              batch_permissions,
            })
            .subscribe({
              next: () => {
                this.toast.show(
                  this.translate.instant('messages.success.users.create'),
                  'success',
                );

                this.closeCreate();
                this.load();

                if ('password' in createdUser && createdUser.password) {
                  this.generatedPassword.set(createdUser.password);
                  this.passwordDialogTitleKey.set('users.new_user');
                  this.openResetPasswordDialog();
                }
              },
              error: (err) => {
                console.error(err);
                this.toast.show(
                  this.translate.instant('messages.error.users.save'),
                  'error',
                );
                this.creating.set(false);
              },
            });
        },
        error: (err) => {
          console.error(err);
          this.toast.show(
            this.translate.instant('messages.error.users.create'),
            'error',
          );
          this.creating.set(false);
        },
      });
  }

  private effectiveCreatePermissions(): BatchPermissionUpdateDto[] {
    return this.createPermissions()
      .filter((item) => item.permissions.length > 0)
      .map((item) => ({
        batch_id: item.batch_id,
        permissions: this.normalizePermissions(item.permissions),
      }));
  }

  openEdit(user: UserDto, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.canManageUsers()) {
      this.showForbidden();
      return;
    }

    this.editingUser.set(user);
    this.editFullName.set(user.full_name);
    this.editIsAdmin.set(user.role === 'admin');

    this.editPermissions.set(
      user.batch_permissions.map((batch) => ({
        batch_id: batch.batch_id,
        permissions: [...batch.permissions],
      })),
    );

    this.batchSearchInput.set('');
    this.selectedBatchId.set(null);
    this.batchPickerOpen.set(false);
    this.batchActiveIndex.set(0);

    this.loadBatchesInfo(true);
    this.editDialogOpen.set(true);

    setTimeout(() => {
      this.editFullNameInput?.nativeElement.focus();
    });
  }

  closeEdit() {
    this.editDialogOpen.set(false);

    this.editingUser.set(null);
    this.editFullName.set('');
    this.editPermissions.set([]);
    this.editIsAdmin.set(false);

    this.batchSearchInput.set('');
    this.selectedBatchId.set(null);
    this.batchPickerOpen.set(false);
    this.batchActiveIndex.set(0);

    this.resettingPassword.set(false);

    this.savingEdit.set(false);
  }

  saveEdit() {
    const user = this.editingUser();
    if (!user || this.savingEdit()) return;

    if (!this.canManageUsers()) {
      this.showForbidden();
      return;
    }

    const full_name = this.editFullName().trim();

    if (!full_name) {
      this.toast.show(
        this.translate.instant('messages.warning.users.empty_name'),
        'warning',
      );
      return;
    }

    this.savingEdit.set(true);

    this.users
      .updateUser(user.id, {
        full_name,
        role: this.editIsAdmin() ? 'admin' : 'user',
        batch_permissions: this.effectiveEditPermissions(),
      })
      .subscribe({
        next: () => {
          this.toast.show(
            this.translate.instant('messages.success.users.edit'),
            'success',
          );
          this.closeEdit();
          this.load();
        },
        error: (err) => {
          console.error(err);
          this.toast.show(
            this.translate.instant('messages.error.users.save'),
            'error',
          );
          this.savingEdit.set(false);
        },
      });
  }

  async onDelete(user: UserDto, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.canManageUsers()) {
      this.showForbidden();
      return;
    }

    if (user.id === this.auth.user()?.id) {
      this.toast.show(
        this.translate.instant('messages.warning.users.delete_self'),
        'warning',
      );
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: this.translate.instant('messages.confirm.users.delete_title'),
      note: this.translate.instant('messages.confirm.users.delete_note'),
      confirmLabel: this.translate.instant('buttons.delete_permanently'),
      confirmKind: 'error',
    });

    if (!confirmed) return;

    this.users.deleteUser(user.id).subscribe({
      next: () => {
        this.toast.show(
          this.translate.instant('messages.success.users.delete'),
          'success',
        );
        this.load();
      },
      error: (err) => {
        console.error(err);
        this.toast.show(
          this.translate.instant('messages.error.users.delete'),
          'error',
        );
      },
    });
  }

  onEditIsAdminInput(event: Event) {
    this.editIsAdmin.set((event.target as HTMLInputElement).checked);
  }

  private showForbidden() {
    this.toast.show(
      this.translate.instant('messages.error.forbidden'),
      'error',
    );
  }

  private loadBatchesInfo(force: boolean = false) {
    if (!force && (this.allBatches().length > 0 || this.loadingBatchesInfo())) {
      return;
    }

    this.loadingBatchesInfo.set(true);

    this.batches
      .getBatchesInfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (batches) => {
          this.allBatches.set(batches);
          this.loadingBatchesInfo.set(false);
        },
        error: (err) => {
          console.error(err);
          this.loadingBatchesInfo.set(false);
          this.toast.show(
            this.translate.instant('messages.error.batches.load'),
            'error',
          );
        },
      });
  }

  onBatchSearchInput(event: Event) {
    this.batchSearchInput.set((event.target as HTMLInputElement).value);
    this.selectedBatchId.set(null);
    this.batchActiveIndex.set(0);
    this.batchPickerOpen.set(true);
  }

  openBatchPicker() {
    if (this.batchPickerDisabled()) return;

    this.loadBatchesInfo();
    this.batchPickerOpen.set(true);
  }

  selectBatch(batch: BatchInfoDto) {
    this.selectedBatchId.set(batch.batch_id);
    this.batchSearchInput.set(batch.name);
    this.batchActiveIndex.set(0);
    this.batchPickerOpen.set(false);
  }

  addSelectedBatch() {
    const batch = this.selectedBatch();
    if (!batch) return;

    const addTo = (
      items: BatchPermissionUpdateDto[],
    ): BatchPermissionUpdateDto[] => {
      if (items.some((item) => item.batch_id === batch.batch_id)) {
        return items;
      }

      const newItem: BatchPermissionUpdateDto = {
        batch_id: batch.batch_id,
        permissions: ['read'],
      };

      return [newItem, ...items];
    };

    if (this.editingUser()) {
      this.editPermissions.update(addTo);
    } else {
      this.createPermissions.update(addTo);
    }

    this.batchSearchInput.set('');
    this.selectedBatchId.set(null);
    this.batchPickerOpen.set(false);
  }

  removeCreateBatchPermission(batchId: number) {
    this.createPermissions.update((items) =>
      items.filter((item) => item.batch_id !== batchId),
    );
  }

  removeAllCreateBatchPermissions() {
    this.createPermissions.set([]);

    this.batchSearchInput.set('');
    this.selectedBatchId.set(null);
    this.batchPickerOpen.set(false);
  }

  hasCreatePermission(batchId: number, permission: Permission): boolean {
    return (
      this.createPermissions()
        .find((item) => item.batch_id === batchId)
        ?.permissions.includes(permission) ?? false
    );
  }

  toggleCreatePermission(
    batchId: number,
    permission: Permission,
    event: Event,
  ) {
    const checked = (event.target as HTMLInputElement).checked;

    this.createPermissions.update((items) =>
      items.map((item) => {
        if (item.batch_id !== batchId) return item;

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

  removeEditBatchPermission(batchId: number) {
    this.editPermissions.update((items) =>
      items.filter((item) => item.batch_id !== batchId),
    );
  }

  removeAllEditBatchPermissions() {
    this.editPermissions.set([]);

    this.batchSearchInput.set('');
    this.selectedBatchId.set(null);
    this.batchPickerOpen.set(false);
  }

  hasEditPermission(batchId: number, permission: Permission): boolean {
    return (
      this.editPermissions()
        .find((item) => item.batch_id === batchId)
        ?.permissions.includes(permission) ?? false
    );
  }

  toggleEditPermission(batchId: number, permission: Permission, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;

    this.editPermissions.update((items) =>
      items.map((item) => {
        if (item.batch_id !== batchId) return item;

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

  isEditingCurrentUser() {
    return this.editingUser()?.id === this.auth.user()?.id;
  }

  private effectiveEditPermissions(): BatchPermissionUpdateDto[] {
    return this.editPermissions()
      .filter((item) => item.permissions.length > 0)
      .map((item) => ({
        batch_id: item.batch_id,
        permissions: this.normalizePermissions(item.permissions),
      }));
  }

  private normalizePermissions(permissions: Permission[]): Permission[] {
    return Array.from(new Set(permissions)).sort() as Permission[];
  }

  private permissionListsEqual(
    a: BatchPermissionUpdateDto[],
    b: BatchPermissionUpdateDto[],
  ): boolean {
    const normalize = (items: BatchPermissionUpdateDto[]) =>
      items
        .filter((item) => item.permissions.length > 0)
        .map((item) => ({
          batch_id: item.batch_id,
          permissions: this.normalizePermissions(item.permissions),
        }))
        .sort((x, y) => x.batch_id - y.batch_id);

    const left = normalize(a);
    const right = normalize(b);

    if (left.length !== right.length) return false;

    return left.every((item, index) => {
      const other = right[index];

      return (
        item.batch_id === other.batch_id &&
        item.permissions.length === other.permissions.length &&
        item.permissions.every((permission, permissionIndex) => {
          return permission === other.permissions[permissionIndex];
        })
      );
    });
  }

  readonly userGroupNames = computed(() => {
    const map = new Map<number, string[]>();

    for (const user of this.usersData()) {
      map.set(
        user.id,
        user.batch_permissions
          .filter((batch) => batch.permissions.length > 0)
          .map((batch) => batch.batch_name),
      );
    }

    return map;
  });

  groupNames(user: UserDto): string[] {
    return this.userGroupNames().get(user.id) ?? [];
  }

  readonly filteredUsers = computed(() => {
    const q = this.searchInput().trim().toLowerCase();

    if (!q) return this.usersData();

    return this.usersData().filter((user) => {
      return (
        user.full_name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        this.groupNames(user).some((name) => name.toLowerCase().includes(q))
      );
    });
  });

  onBatchPickerKeydown(event: KeyboardEvent) {
    if (this.batchPickerDisabled()) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      const wasOpen = this.batchPickerOpen();
      this.openBatchPicker();

      if (wasOpen) {
        this.moveBatchActiveIndex(1);
      } else {
        this.batchActiveIndex.set(0);
      }

      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      const wasOpen = this.batchPickerOpen();
      this.openBatchPicker();

      if (wasOpen) {
        this.moveBatchActiveIndex(-1);
      } else {
        this.batchActiveIndex.set(
          Math.max(0, this.availableBatches().length - 1),
        );
      }

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      if (this.batchPickerOpen()) {
        this.selectActiveBatch();
        return;
      }

      if (this.selectedBatch()) {
        this.addSelectedBatch();
      }

      return;
    }

    if (event.key === 'Escape' && this.batchPickerOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.closeBatchPicker();
    }
  }

  private moveBatchActiveIndex(direction: 1 | -1) {
    const count = this.availableBatches().length;
    if (count === 0) return;

    this.batchActiveIndex.update((index) => {
      return (index + direction + count) % count;
    });

    this.scrollActiveBatchIntoView();
  }

  private scrollActiveBatchIntoView() {
    requestAnimationFrame(() => {
      this.batchOptions
        ?.get(this.batchActiveIndex())
        ?.nativeElement.scrollIntoView({
          block: 'nearest',
        });
    });
  }

  private selectActiveBatch() {
    const batch = this.availableBatches()[this.batchActiveIndex()];
    if (!batch) return;

    this.selectBatch(batch);
  }

  resetPassword() {
    const user = this.editingUser();
    if (!user || this.resettingPassword()) return;

    if (!this.canManageUsers()) {
      this.showForbidden();
      return;
    }

    this.resettingPassword.set(true);

    this.users
      .resetUserPassword(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.generatedPassword.set(response.password);
          this.resettingPassword.set(false);

          this.passwordDialogTitleKey.set('users.new_password');
          this.openResetPasswordDialog();

          this.toast.show(
            this.translate.instant('messages.success.users.reset_password'),
            'success',
          );
        },
        error: (err) => {
          console.error(err);
          this.resettingPassword.set(false);

          this.toast.show(
            this.translate.instant('messages.error.users.reset_password'),
            'error',
          );
        },
      });
  }

  private openResetPasswordDialog() {
    this.clearResetPasswordCloseTimer();

    this.resetPasswordDialogLocked.set(true);
    this.resetPasswordDialogOpen.set(true);

    this.resetPasswordCloseTimer = setTimeout(() => {
      this.resetPasswordDialogLocked.set(false);
      this.resetPasswordCloseTimer = null;
    }, 3000);
  }

  closeResetPasswordDialog() {
    if (this.resetPasswordDialogLocked()) return;

    this.resetPasswordDialogOpen.set(false);

    this.clearPasswordCopiedState();
    this.generatedPassword.set('');
    this.clearResetPasswordCloseTimer();
  }

  async copyGeneratedPassword() {
    try {
      await navigator.clipboard.writeText(this.generatedPassword());

      this.passwordCopied.set(true);

      if (this.passwordCopiedTimeout) {
        clearTimeout(this.passwordCopiedTimeout);
      }

      this.passwordCopiedTimeout = setTimeout(() => {
        this.passwordCopied.set(false);
        this.passwordCopiedTimeout = null;
      }, 5000);
    } catch {
      this.clearPasswordCopiedState();
    }
  }

  private clearPasswordCopiedState() {
    if (this.passwordCopiedTimeout) {
      clearTimeout(this.passwordCopiedTimeout);
      this.passwordCopiedTimeout = null;
    }

    this.passwordCopied.set(false);
  }

  private clearResetPasswordCloseTimer() {
    if (this.resetPasswordCloseTimer) {
      clearTimeout(this.resetPasswordCloseTimer);
      this.resetPasswordCloseTimer = null;
    }

    this.resetPasswordDialogLocked.set(false);
  }

  onCreateEscape() {
    if (this.resetPasswordDialogOpen()) return;
    if (!this.createDialogOpen()) return;

    if (this.batchPickerOpen()) {
      this.closeBatchPicker();
      return;
    }

    this.closeCreate();
  }

  onEditEscape() {
    if (this.resetPasswordDialogOpen()) return;
    if (!this.editDialogOpen()) return;

    if (this.batchPickerOpen()) {
      this.closeBatchPicker();
      return;
    }

    this.closeEdit();
  }

  onResetPasswordEscape() {
    if (!this.resetPasswordDialogOpen()) return;
    if (this.resetPasswordDialogLocked()) return;

    this.closeResetPasswordDialog();
  }
}
