import { Permission } from '@/app/models';
import { Injectable, inject } from '@angular/core';
import { AuthService } from './api/auth.service';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private auth = inject(AuthService);

  hasPermission(
    batchId: number | null | undefined,
    permission: Permission,
  ): boolean {
    const user = this.auth.currentUser();

    if (!user || batchId == null) return false;

    if (user.role === 'admin') return true;

    return user.batch_permissions.some(
      (batch) =>
        batch.batch_id === batchId && batch.permissions.includes(permission),
    );
  }

  canRead(batchId: number | null | undefined): boolean {
    return this.hasPermission(batchId, 'read');
  }

  canWrite(batchId: number | null | undefined): boolean {
    return this.hasPermission(batchId, 'write');
  }

  canDelete(batchId: number | null | undefined): boolean {
    return this.hasPermission(batchId, 'delete');
  }

  canExport(batchId: number | null | undefined): boolean {
    return this.hasPermission(batchId, 'export');
  }

  canEditBatch(batchId: number | null | undefined): boolean {
    return this.hasPermission(batchId, 'edit');
  }

  canCreateBatch(): boolean {
    return !!this.auth.currentUser();
  }

  canManageBatch(batchId: number | null | undefined): boolean {
    return this.canEditBatch(batchId);
  }

  canDeleteBatch(batchId: number | null | undefined): boolean {
    return this.canEditBatch(batchId);
  }

  canManageBatchMembers(batchId: number | null | undefined): boolean {
    return this.canEditBatch(batchId);
  }

  canManageUsers(): boolean {
    return this.auth.currentUser()?.role === 'admin';
  }
}
