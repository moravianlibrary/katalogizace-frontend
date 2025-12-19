import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { EnvironmentService } from '../services/environment.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(EnvironmentService);
  const auth = inject(AuthService);

  const apiBaseUrl = env.get('apiServiceBaseUrl');
  if (!req.url.startsWith(apiBaseUrl)) return next(req);

  if (req.url.startsWith(`${apiBaseUrl}/users/login`)) return next(req);

  const token = auth.token();
  if (!token) return next(req);

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
