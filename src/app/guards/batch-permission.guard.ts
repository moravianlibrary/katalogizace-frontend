import { Permission } from '@/app/models';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionsService } from '../services/permissions.service';

export const batchPermissionGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const permissions = inject(PermissionsService);

  const batchId = Number(route.paramMap.get('batchId'));
  const requiredPermission = route.data['permission'] as Permission | undefined;

  if (!requiredPermission) return true;

  if (!Number.isFinite(batchId)) {
    return router.createUrlTree(['/forbidden']);
  }

  return permissions.hasPermission(batchId, requiredPermission)
    ? true
    : router.createUrlTree(['/forbidden']);
};
