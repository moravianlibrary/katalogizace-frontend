import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/api/auth.service';
import { BreadcrumbsService } from '../../../services/breadcrumbs.service';

@Component({
  standalone: true,
  selector: 'app-protected-layout',
  imports: [CommonModule, RouterModule],
  templateUrl: './protected-layout.component.html',
})
export class ProtectedLayoutComponent {
  private router = inject(Router);
  auth = inject(AuthService);
  breadcrumbs = inject(BreadcrumbsService);

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
