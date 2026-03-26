import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../services/api/auth.service';
import { BreadcrumbsService } from '../../../services/breadcrumbs.service';

@Component({
  standalone: true,
  selector: 'app-protected-layout',
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './protected-layout.component.html',
})
export class ProtectedLayoutComponent {
  private router = inject(Router);
  auth = inject(AuthService);
  breadcrumbs = inject(BreadcrumbsService);
  readonly userMenuOpen = signal(false);

  toggleUserMenu() {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu() {
    this.userMenuOpen.set(false);
  }

  logout() {
    this.closeUserMenu();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
