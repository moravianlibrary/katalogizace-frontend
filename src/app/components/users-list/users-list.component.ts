import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { UserDto } from '@/app/models';
import { AuthService } from '@/app/services/api/auth.service';
import { UsersService } from '@/app/services/api/users.service';
import { BreadcrumbsService } from '@/app/services/breadcrumbs.service';
import { ConfirmDialogService } from '@/app/services/confirm-dialog.service';
import { PermissionsService } from '@/app/services/permissions.service';
import { ToastService } from '@/app/services/toast.service';
import {
  UserDialogComponent,
  type UserDialogPasswordGenerated,
} from '../dialogs/user-dialog/user-dialog.component';
import { IconComponent } from '../icon/icon.component';
import { UserBatchesCellComponent } from '../user-batches-cell/user-batches-cell.component';

@Component({
  standalone: true,
  selector: 'app-users-list',
  imports: [
    TranslateModule,
    IconComponent,
    UserBatchesCellComponent,
    UserDialogComponent,
  ],
  templateUrl: './users-list.component.html',
})
export class UsersListComponent {
  private users = inject(UsersService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private breadcrumbs = inject(BreadcrumbsService);
  private permissions = inject(PermissionsService);
  private confirmDialog = inject(ConfirmDialogService);
  auth = inject(AuthService);

  loading = signal(false);
  error = signal<string | null>(null);
  usersData = signal<UserDto[]>([]);

  editingUser = signal<UserDto | null>(null);

  searchInput = signal('');

  createDialogOpen = signal(false);

  editDialogOpen = signal(false);

  generatedPassword = signal('');
  resetPasswordDialogLocked = signal(false);
  resetPasswordDialogOpen = signal(false);
  readonly passwordDialogTitleKey = signal('users.new_password');

  private resetPasswordCloseTimer: ReturnType<typeof setTimeout> | null = null;

  readonly passwordCopied = signal(false);
  private passwordCopiedTimeout: ReturnType<typeof setTimeout> | null = null;

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

  openCreate() {
    if (!this.canManageUsers()) {
      this.showForbidden();
      return;
    }

    this.createDialogOpen.set(true);
  }

  closeCreate() {
    this.createDialogOpen.set(false);
  }

  openEdit(user: UserDto, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.canManageUsers()) {
      this.showForbidden();
      return;
    }

    this.editingUser.set(user);
    this.editDialogOpen.set(true);
  }

  closeEdit() {
    this.editDialogOpen.set(false);
    this.editingUser.set(null);
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

  private showForbidden() {
    this.toast.show(
      this.translate.instant('messages.error.forbidden'),
      'error',
    );
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

  onPasswordGenerated(event: UserDialogPasswordGenerated) {
    this.generatedPassword.set(event.password);
    this.passwordDialogTitleKey.set(event.titleKey);
    this.openResetPasswordDialog();
  }

  onResetPasswordEscape() {
    if (!this.resetPasswordDialogOpen()) return;
    if (this.resetPasswordDialogLocked()) return;

    this.closeResetPasswordDialog();
  }
}
