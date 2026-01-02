import { CommonModule, Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-protected-layout',
  imports: [CommonModule, RouterModule],
  templateUrl: './protected-layout.component.html',
})
export class ProtectedLayoutComponent {
  private router = inject(Router);
  private location = inject(Location);
  auth = inject(AuthService);

  private currentPath = signal<string>(this.router.url.split('?')[0]);

  showBack = computed(() => this.currentPath() !== '/batches');

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.currentPath.set(e.urlAfterRedirects.split('?')[0]);
      });
  }

  back() {
    this.location.back();
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
