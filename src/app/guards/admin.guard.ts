import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/api/auth.service';
import { PermissionsService } from '../services/permissions.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const permissions = inject(PermissionsService);
  const router = inject(Router);

  const check = () =>
    permissions.canManageUsers() ? true : router.createUrlTree(['/forbidden']);

  if (auth.currentUser()) {
    return check();
  }

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  return auth.loadCurrentUser().pipe(
    map(() => check()),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
