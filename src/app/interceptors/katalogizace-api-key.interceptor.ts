import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const katalogizaceApiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const isApi = req.url.startsWith(environment.API_BASE_URL);
  const augmented = isApi
    ? req.clone({
        setHeaders: {
          'KATALOGIZACE-API-KEY': environment.KATALOGIZACE_API_KEY,
        },
      })
    : req;
  return next(augmented);
};
