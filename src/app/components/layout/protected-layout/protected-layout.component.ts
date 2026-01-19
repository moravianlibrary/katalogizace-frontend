import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../services/api/auth.service';

@Component({
  standalone: true,
  selector: 'app-protected-layout',
  imports: [CommonModule, RouterModule],
  templateUrl: './protected-layout.component.html',
})
export class ProtectedLayoutComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
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
    const leaf = this.getLeafRoute();
    const backTo = leaf.snapshot.data?.['backTo'] as string | null | undefined;

    // default fallback
    if (!backTo) {
      this.router.navigateByUrl('/batches');
      return;
    }

    // relative back
    if (backTo.startsWith('../')) {
      this.router.navigate([backTo], { relativeTo: leaf });
      return;
    }

    // absolute path
    if (backTo.startsWith('/')) {
      this.router.navigateByUrl(backTo);
      return;
    }

    // safety
    this.router.navigateByUrl('/' + backTo);
  }

  private getLeafRoute(): ActivatedRoute {
    let r = this.route;

    while (r.firstChild) {
      r = r.firstChild;
    }

    return r;
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
