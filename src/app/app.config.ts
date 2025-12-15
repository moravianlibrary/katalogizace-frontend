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
import { EnvironmentService } from './services/environment.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiKeyInterceptor])),
    provideAppInitializer(() => {
      // Inject services
      const envService = inject(EnvironmentService);
      return (async () => {
        // Wait for environment to load
        await envService.load();
        const apiServiceBaseUrl = envService.get('apiServiceBaseUrl') as string;
        //console.log('Using apiServiceBaseUrl:', apiServiceBaseUrl);
      })();
    }),
  ],
};
