import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { EnvironmentService } from './services/environment.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  envService = inject(EnvironmentService);
  ngOnInit(): void {
    this.logDevInfo();
  }

  logDevInfo(): void {
    const devInfo = {
      useStaticRuntimeConfig: this.envService.get('useStaticRuntimeConfig'),
      devMode: this.envService.get('devMode'),
      environmentCode: this.envService.get('environmentCode'),
      environmentName: this.envService.get('environmentName'),

      apiServiceBaseUrl: this.envService.get('apiServiceBaseUrl'),

      gitCommitHash: this.envService.get('git_commit_hash'),
      gitTag: this.envService.get('git_tag'),
      buildDate: this.envService.get('build_date'),
    };
    console.log('Dev Info:', devInfo);
    if (devInfo.gitCommitHash) {
      console.log(
        'https://github.com/trineracz/katalogizace-frontend/commit/' +
          devInfo.gitCommitHash,
      );
    }
  }
}
