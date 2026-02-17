import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { apiKeyInterceptor } from './interceptors/api-key.interceptor';
import { authErrorInterceptor } from './interceptors/auth-error.interceptor';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AuthService } from './services/api/auth.service';
import { EnvironmentService } from './services/environment.service';

import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { I18nService } from './services/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        apiKeyInterceptor,
        authInterceptor,
        authErrorInterceptor,
      ]),
    ),
    importProvidersFrom(
      TranslateModule.forRoot({
        fallbackLang: 'cs',
      }),
    ),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json',
    }),

    provideAppInitializer(() => {
      // Inject services
      const envService = inject(EnvironmentService);
      const auth = inject(AuthService);
      const i18n = inject(I18nService);

      return (async () => {
        i18n.init();
        // Wait for environment to load
        await envService.load();

        if (auth.isLoggedIn()) {
          auth.loadCurrentUser().subscribe({
            error: () => auth.logout(),
          });
        }
      })();
    }),
  ],
};
