import { BatchInfoDto, BatchPermissionUpdateDto, UserDto } from '@/app/models';
import { AuthService } from '@/app/services/api/auth.service';
import { BatchesService } from '@/app/services/api/batches.service';
import { UsersService } from '@/app/services/api/users.service';
import { PermissionsService } from '@/app/services/permissions.service';
import { ToastService } from '@/app/services/toast.service';
import {
  normalizePermissions,
  permissionListsEqual,
} from '@/app/utils/permission-utils';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icon/icon.component';
import {
  PermissionAssignmentEditorComponent,
  type PermissionAssignmentOption,
  type PermissionAssignmentRow,
  type PermissionAssignmentToggle,
} from '../../shared/permission-assignment-editor/permission-assignment-editor.component';
import { DialogShellComponent } from '../dialog-shell/dialog-shell.component';

export type UserDialogMode = 'create' | 'edit';

export type UserDialogPasswordGenerated = {
  titleKey: string;
  password: string;
};

@Component({
  standalone: true,
  selector: 'app-user-dialog',
  imports: [
    TranslateModule,
    IconComponent,
    DialogShellComponent,
    PermissionAssignmentEditorComponent,
  ],
  templateUrl: './user-dialog.component.html',
})
export class UserDialogComponent {
  private users = inject(UsersService);
  private permissions = inject(PermissionsService);
  private batches = inject(BatchesService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  open = input<boolean>(false);
  mode = input<UserDialogMode>('create');
  user = input<UserDto | null>(null);

  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly passwordGenerated = output<UserDialogPasswordGenerated>();

  readonly fullName = signal('');
  readonly email = signal('');
  readonly isAdmin = signal(false);
  readonly permissionsState = signal<BatchPermissionUpdateDto[]>([]);
  readonly submitting = signal(false);
  readonly resettingPassword = signal(false);

  readonly allBatches = signal<BatchInfoDto[]>([]);
  readonly loadingBatchesInfo = signal(false);

  @ViewChild('fullNameInput')
  fullNameInput?: ElementRef<HTMLInputElement>;

  readonly isCreate = computed(() => this.mode() === 'create');

  readonly edited = computed(() => {
    const user = this.user();
    if (!user || this.isCreate()) return false;

    const nameChanged = this.fullName().trim() !== user.full_name.trim();
    const roleChanged = this.isAdmin() !== (user.role === 'admin');

    const originalPermissions = user.batch_permissions.map((batch) => ({
      batch_id: batch.batch_id,
      permissions: batch.permissions,
    }));

    const permissionsChanged = !permissionListsEqual(
      this.effectivePermissions(),
      originalPermissions,
      (item) => item.batch_id,
    );

    return nameChanged || roleChanged || permissionsChanged;
  });

  readonly batchNameById = computed(() => {
    const map = new Map<number, string>();

    for (const batch of this.allBatches()) {
      map.set(batch.batch_id, batch.name);
    }

    const user = this.user();
    if (user) {
      for (const batch of user.batch_permissions) {
        if (!map.has(batch.batch_id)) {
          map.set(batch.batch_id, batch.batch_name);
        }
      }
    }

    return map;
  });

  readonly batchOptions = computed<PermissionAssignmentOption[]>(() => {
    return this.allBatches().map((batch) => ({
      id: batch.batch_id,
      title: batch.name,
      subtitle: batch.description,
    }));
  });

  readonly permissionRows = computed<PermissionAssignmentRow[]>(() => {
    const names = this.batchNameById();

    return this.permissionsState().map((item) => ({
      id: item.batch_id,
      title: names.get(item.batch_id) ?? `#${item.batch_id}`,
      permissions: item.permissions,
    }));
  });

  readonly dialogTitle = computed(() => {
    return this.isCreate()
      ? this.translate.instant('users.create')
      : this.translate.instant('users.edit');
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;

      if (!this.isCreate() && !this.user()) return;

      this.initializeState();
    });
  }

  close() {
    this.closed.emit();
  }

  onEscape(editor: PermissionAssignmentEditorComponent) {
    if (editor.pickerOpen()) {
      editor.closePicker();
      return;
    }

    this.close();
  }

  onFullNameInput(event: Event) {
    this.fullName.set((event.target as HTMLInputElement).value);
  }

  onEmailInput(event: Event) {
    this.email.set((event.target as HTMLInputElement).value);
  }

  onIsAdminInput(event: Event) {
    this.isAdmin.set((event.target as HTMLInputElement).checked);
  }

  addBatch(batchId: number) {
    this.permissionsState.update((items) => {
      if (items.some((item) => item.batch_id === batchId)) {
        return items;
      }

      return [
        {
          batch_id: batchId,
          permissions: ['read'],
        },
        ...items,
      ];
    });
  }

  removeBatch(batchId: number) {
    this.permissionsState.update((items) =>
      items.filter((item) => item.batch_id !== batchId),
    );
  }

  removeAllBatches() {
    this.permissionsState.set([]);
  }

  togglePermission(change: PermissionAssignmentToggle) {
    this.permissionsState.update((items) =>
      items.map((item) => {
        if (item.batch_id !== change.rowId) return item;

        const permissions = change.checked
          ? Array.from(new Set([...item.permissions, change.permission]))
          : item.permissions.filter(
              (permission) => permission !== change.permission,
            );

        return {
          ...item,
          permissions,
        };
      }),
    );
  }

  submit() {
    if (this.submitting()) return;

    if (!this.permissions.canManageUsers()) {
      this.showForbidden();
      return;
    }

    if (this.isCreate()) {
      this.createUser();
      return;
    }

    this.saveEdit();
  }

  resetPassword() {
    const user = this.user();
    if (!user || this.resettingPassword()) return;

    if (!this.permissions.canManageUsers()) {
      this.showForbidden();
      return;
    }

    this.resettingPassword.set(true);

    this.users
      .resetUserPassword(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.resettingPassword.set(false);

          this.passwordGenerated.emit({
            titleKey: 'users.new_password',
            password: response.password,
          });

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

  isEditingCurrentUser() {
    return this.user()?.id === this.auth.user()?.id;
  }

  private initializeState() {
    this.submitting.set(false);
    this.resettingPassword.set(false);

    if (this.isCreate()) {
      this.fullName.set('');
      this.email.set('');
      this.isAdmin.set(false);
      this.permissionsState.set([]);
    } else {
      const user = this.user()!;
      this.fullName.set(user.full_name);
      this.email.set(user.email);
      this.isAdmin.set(user.role === 'admin');
      this.permissionsState.set(
        user.batch_permissions.map((batch) => ({
          batch_id: batch.batch_id,
          permissions: [...batch.permissions],
        })),
      );
    }

    this.loadBatchesInfo(true);

    queueMicrotask(() => {
      this.fullNameInput?.nativeElement.focus();
    });
  }

  private createUser() {
    const full_name = this.fullName().trim();
    const email = this.email().trim();

    if (!full_name || !email) {
      this.toast.show(
        this.translate.instant('messages.warning.users.create_required'),
        'warning',
      );
      return;
    }

    this.submitting.set(true);

    const batch_permissions = this.effectivePermissions();

    this.users
      .createUser({
        full_name,
        email,
        permissions: batch_permissions,
      })
      .subscribe({
        next: (createdUser) => {
          const shouldUpdateAfterCreate =
            this.isAdmin() || batch_permissions.length > 0;

          if (!shouldUpdateAfterCreate) {
            this.finishSuccess(
              this.translate.instant('messages.success.users.create'),
              createdUser.password,
              'users.new_user',
            );
            return;
          }

          this.users
            .updateUser(createdUser.id, {
              full_name,
              role: this.isAdmin() ? 'admin' : 'user',
              batch_permissions,
            })
            .subscribe({
              next: () => {
                this.finishSuccess(
                  this.translate.instant('messages.success.users.create'),
                  createdUser.password,
                  'users.new_user',
                );
              },
              error: (err) => {
                console.error(err);
                this.toast.show(
                  this.translate.instant('messages.error.users.save'),
                  'error',
                );
                this.submitting.set(false);
              },
            });
        },
        error: (err) => {
          console.error(err);
          this.toast.show(
            this.translate.instant('messages.error.users.create'),
            'error',
          );
          this.submitting.set(false);
        },
      });
  }

  private saveEdit() {
    const user = this.user();
    if (!user) return;

    const full_name = this.fullName().trim();

    if (!full_name) {
      this.toast.show(
        this.translate.instant('messages.warning.users.empty_name'),
        'warning',
      );
      return;
    }

    this.submitting.set(true);

    this.users
      .updateUser(user.id, {
        full_name,
        role: this.isAdmin() ? 'admin' : 'user',
        batch_permissions: this.effectivePermissions(),
      })
      .subscribe({
        next: () => {
          this.finishSuccess(
            this.translate.instant('messages.success.users.edit'),
          );
        },
        error: (err) => {
          console.error(err);
          this.toast.show(
            this.translate.instant('messages.error.users.save'),
            'error',
          );
          this.submitting.set(false);
        },
      });
  }

  private finishSuccess(
    message: string,
    password?: string,
    passwordTitleKey?: string,
  ) {
    this.toast.show(message, 'success');
    this.saved.emit();
    this.closed.emit();

    if (password && passwordTitleKey) {
      this.passwordGenerated.emit({
        titleKey: passwordTitleKey,
        password,
      });
    }
  }

  private effectivePermissions(): BatchPermissionUpdateDto[] {
    return this.permissionsState()
      .filter((item) => item.permissions.length > 0)
      .map((item) => ({
        batch_id: item.batch_id,
        permissions: normalizePermissions(item.permissions),
      }));
  }

  private showForbidden() {
    this.toast.show(
      this.translate.instant('messages.error.forbidden'),
      'error',
    );
  }

  private loadBatchesInfo(force = false) {
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
}
