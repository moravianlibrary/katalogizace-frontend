import { NgClass } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  ViewChild,
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
  auth = inject(AuthService);

  loading = signal(false);
  error = signal<string | null>(null);
  usersData = signal<UserDto[]>([]);

  editingUser = signal<UserDto | null>(null);

  searchInput = signal('');

  creating = signal(false);
  newFullName = signal('');
  newEmail = signal('');
  newPassword = signal('');

  editFullName = signal('');
  savingEdit = signal(false);
  editIsAdmin = signal(false);

  editPermissions = signal<BatchPermissionUpdateDto[]>([]);

  allBatches = signal<BatchInfoDto[]>([]);
  loadingBatchesInfo = signal(false);

  batchSearchInput = signal('');
  batchPickerOpen = signal(false);
  selectedBatchId = signal<number | null>(null);

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

  @ViewChild('createDialog', { static: true })
  createDialog!: ElementRef<HTMLDialogElement>;

  @ViewChild('editDialog', { static: true })
  editDialog!: ElementRef<HTMLDialogElement>;

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

  readonly availableBatches = computed(() => {
    const q = this.batchSearchInput().trim().toLowerCase();
    const selectedIds = new Set(this.editPermissions().map((p) => p.batch_id));

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

  toggleBatchPicker() {
    if (this.savingEdit()) return;

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

  onNewPasswordInput(event: Event) {
    this.newPassword.set((event.target as HTMLInputElement).value);
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
    this.newPassword.set('');
    this.createDialog.nativeElement.showModal();
  }

  closeCreate() {
    if (this.createDialog?.nativeElement.open) {
      this.createDialog.nativeElement.close();
    }

    this.newFullName.set('');
    this.newEmail.set('');
    this.newPassword.set('');
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
    const password = this.newPassword();

    if (!full_name || !email || !password) {
      this.toast.show(
        this.translate.instant('messages.warning.users.create_required'),
        'warning',
      );
      return;
    }

    this.creating.set(true);

    this.users
      .createUser({
        full_name,
        email,
        password,
      })
      .subscribe({
        next: () => {
          this.toast.show(
            this.translate.instant('messages.success.users.create'),
            'success',
          );
          this.closeCreate();
          this.load();
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

    this.loadBatchesInfo(true);
    this.editDialog.nativeElement.showModal();
  }

  closeEdit() {
    if (this.editDialog?.nativeElement.open) {
      this.editDialog.nativeElement.close();
    }

    this.editingUser.set(null);
    this.editFullName.set('');
    this.editPermissions.set([]);
    this.editIsAdmin.set(false);

    this.batchSearchInput.set('');
    this.selectedBatchId.set(null);
    this.batchPickerOpen.set(false);

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

  onDelete(user: UserDto, event: MouseEvent) {
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

    const confirmed = confirm(
      this.translate.instant('messages.confirm.users.delete'),
    );

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
    this.batchPickerOpen.set(true);
  }

  openBatchPicker() {
    if (this.savingEdit()) return;

    this.loadBatchesInfo();
    this.batchPickerOpen.set(true);
  }

  selectBatch(batch: BatchInfoDto) {
    this.selectedBatchId.set(batch.batch_id);
    this.batchSearchInput.set(batch.name);
    this.batchPickerOpen.set(false);
  }

  addSelectedBatch() {
    const batch = this.selectedBatch();
    if (!batch) return;

    this.editPermissions.update((items) => {
      if (items.some((item) => item.batch_id === batch.batch_id)) {
        return items;
      }

      return [
        {
          batch_id: batch.batch_id,
          permissions: ['read'],
        },
        ...items,
      ];
    });

    this.batchSearchInput.set('');
    this.selectedBatchId.set(null);
    this.batchPickerOpen.set(false);
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
}
