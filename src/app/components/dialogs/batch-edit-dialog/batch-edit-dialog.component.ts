import {
  BatchDto,
  BatchMemberPermissionRequest,
  EditableBatchMember,
  UserInfoDto,
} from '@/app/models';
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
import { forkJoin, Observable, of, switchMap } from 'rxjs';
import {
  PermissionAssignmentEditorComponent,
  type PermissionAssignmentOption,
  type PermissionAssignmentRow,
  type PermissionAssignmentToggle,
} from '../../shared/permission-assignment-editor/permission-assignment-editor.component';
import { DialogShellComponent } from '../dialog-shell/dialog-shell.component';

@Component({
  standalone: true,
  selector: 'app-batch-edit-dialog',
  imports: [
    TranslateModule,
    DialogShellComponent,
    PermissionAssignmentEditorComponent,
  ],
  templateUrl: './batch-edit-dialog.component.html',
})
export class BatchEditDialogComponent {
  private batches = inject(BatchesService);
  private users = inject(UsersService);
  private permissions = inject(PermissionsService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  open = input<boolean>(false);
  batch = input<BatchDto | null>(null);

  readonly closed = output<void>();
  readonly saved = output<void>();

  readonly name = signal('');
  readonly description = signal('');
  readonly saving = signal(false);

  readonly editMembers = signal<EditableBatchMember[]>([]);
  readonly originalEditMembers = signal<BatchMemberPermissionRequest[]>([]);

  readonly allUsers = signal<UserInfoDto[]>([]);
  readonly loadingUsersInfo = signal(false);
  readonly loadingBatchMembers = signal(false);

  @ViewChild('nameInput')
  nameInput?: ElementRef<HTMLInputElement>;

  readonly userOptions = computed<PermissionAssignmentOption[]>(() => {
    return this.allUsers().map((user) => ({
      id: user.id,
      title: user.full_name,
      subtitle: user.email,
      role: user.role,
    }));
  });

  readonly memberRows = computed<PermissionAssignmentRow[]>(() => {
    return this.editMembers().map((member) => ({
      id: member.user_id,
      title: member.full_name,
      subtitle: member.email,
      role: member.role,
      permissions: member.permissions,
    }));
  });

  readonly edited = computed(() => {
    const batch = this.batch();
    if (!batch) return false;

    const metadataChanged =
      this.name().trim() !== (batch.name ?? '').trim() ||
      this.description().trim() !== (batch.description ?? '').trim();

    const membersChanged = !permissionListsEqual(
      this.effectiveEditMembers(),
      this.originalEditMembers(),
      (item) => item.user_id,
    );

    return metadataChanged || membersChanged;
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;

      const batch = this.batch();
      if (!batch) return;

      this.name.set((batch.name ?? '').trim());
      this.description.set((batch.description ?? '').trim());
      this.editMembers.set([]);
      this.originalEditMembers.set([]);
      this.saving.set(false);

      this.loadUsersInfo(true);
      this.loadBatchMembers(batch.batch_id);

      queueMicrotask(() => {
        this.nameInput?.nativeElement.focus();
      });
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

  onNameInput(event: Event) {
    this.name.set((event.target as HTMLInputElement).value);
  }

  onDescriptionInput(event: Event) {
    this.description.set((event.target as HTMLInputElement).value);
  }

  addMember(userId: number) {
    const user = this.allUsers().find((item) => item.id === userId);
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
  }

  removeMember(userId: number) {
    this.editMembers.update((items) =>
      items.filter((item) => item.user_id !== userId),
    );
  }

  removeAllMembers() {
    this.editMembers.set([]);
  }

  toggleMemberPermission(change: PermissionAssignmentToggle) {
    this.editMembers.update((items) =>
      items.map((item) => {
        if (item.user_id !== change.rowId) return item;

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

  saveEdit() {
    const batch = this.batch();
    if (!batch || this.saving()) return;

    if (!this.permissions.canManageBatch(batch.batch_id)) {
      this.showForbidden();
      return;
    }

    const name = this.name().trim();
    const descRaw = this.description().trim();
    const description: string | null = descRaw ? descRaw : null;

    if (!name) {
      this.toast.show(
        this.translate.instant('messages.warning.batches.edit_empty_name'),
        'warning',
      );
      return;
    }

    this.saving.set(true);

    this.batches
      .updateBatch(batch.batch_id.toString(), {
        name,
        description,
        state: batch.state,
      })
      .pipe(switchMap(() => this.syncBatchMembers(batch.batch_id)))
      .subscribe({
        next: () => {
          this.toast.show(
            this.translate.instant('messages.success.batches.edit'),
            'success',
          );

          this.auth.loadCurrentUser().subscribe({
            error: (err) => {
              console.error(err);
              this.toast.show(
                this.translate.instant('messages.error.auth.user_load'),
                'error',
              );
            },
          });

          this.saved.emit();
          this.closed.emit();
        },
        error: (err) => {
          console.error(err);
          this.toast.show(
            this.translate.instant('messages.error.batches.save'),
            'error',
          );
          this.saving.set(false);
        },
      });
  }

  private showForbidden() {
    this.toast.show(
      this.translate.instant('messages.error.forbidden'),
      'error',
    );
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

  private effectiveEditMembers(): BatchMemberPermissionRequest[] {
    return this.editMembers()
      .filter((item) => item.permissions.length > 0)
      .map((item) => ({
        user_id: item.user_id,
        permissions: normalizePermissions(item.permissions),
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

      return !permissionListsEqual(
        [item],
        [originalItem],
        (member) => member.user_id,
      );
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
}
