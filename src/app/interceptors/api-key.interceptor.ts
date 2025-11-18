import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { EnvironmentService } from '../services/environment.service';

export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const envService = inject(EnvironmentService);
  const apiBaseUrl = envService.get('apiServiceBaseUrl');

  const isApi = req.url.startsWith(apiBaseUrl);
  const augmented = isApi
    ? req.clone({
      setHeaders: {
        'KATALOGIZACE-API-KEY': envService.get('apiServiceKey'),
      },
    })
    : req;
  return next(augmented);
};
