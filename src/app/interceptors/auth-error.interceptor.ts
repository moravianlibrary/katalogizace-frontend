import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../services/api/auth.service';
import { ToastService } from '../services/toast.service';
import { extractApiErrorMessage } from '../utils/api-error.util';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      const backendMessage = extractApiErrorMessage(err.error);

      if (err.status === 401) {
        if (!router.url.startsWith('/login')) {
          if (backendMessage) {
            toast.show(backendMessage, 'error');
          }

          auth.logout();
          router.navigate(['/login'], {
            queryParams: { returnUrl: router.url },
          });
        }

        return throwError(() => err);
      }

      if (err.status === 403) {
        return auth.loadCurrentUser().pipe(
          catchError(() => of(null)),
          tap(() => {
            if (!router.url.startsWith('/forbidden')) {
              if (backendMessage) {
                toast.show(backendMessage, 'error');
              }

              router.navigateByUrl('/forbidden');
            }
          }),
          switchMap(() => throwError(() => err)),
        );
      }
      return throwError(() => err);
    }),
  );
};
