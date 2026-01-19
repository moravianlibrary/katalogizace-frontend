import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
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
    provideAppInitializer(() => {
      // Inject services
      const envService = inject(EnvironmentService);
      const auth = inject(AuthService);

      return (async () => {
        // Wait for environment to load
        await envService.load();
        const apiServiceBaseUrl = envService.get('apiServiceBaseUrl') as string;
        //console.log('Using apiServiceBaseUrl:', apiServiceBaseUrl);

        if (auth.isLoggedIn()) {
          auth.loadCurrentUser().subscribe({
            error: () => auth.logout(),
          });
        }
      })();
    }),
  ],
};
