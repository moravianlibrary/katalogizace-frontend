import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';

import { ContextPanelService } from '@/app/services/context-panel.service';
import { MarcDiffService } from '@/app/services/marc-diff.service';
import { AuthService } from '../../../services/api/auth.service';
import { BatchesService } from '../../../services/api/batches.service';
import { BreadcrumbsService } from '../../../services/breadcrumbs.service';
import { IconComponent } from '../../icon/icon.component';

type BatchBookNav = {
  batchId: number;
  prevBookId: number | null;
  nextBookId: number | null;
};

@Component({
  standalone: true,
  selector: 'app-protected-layout',
  imports: [CommonModule, RouterModule, TranslateModule, IconComponent],
  templateUrl: './protected-layout.component.html',
})
export class ProtectedLayoutComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private batches = inject(BatchesService);
  private diff = inject(MarcDiffService);
  private cps = inject(ContextPanelService);

  auth = inject(AuthService);
  breadcrumbs = inject(BreadcrumbsService);
  readonly userMenuOpen = signal(false);

  private readonly navEnd = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    { initialValue: null },
  );

  readonly currentRouteParams = computed(() => {
    this.navEnd();

    let route: ActivatedRoute | null = this.route;
    while (route?.firstChild) {
      route = route.firstChild;
    }

    const bookId = Number(route?.snapshot.paramMap.get('bookId'));
    const batchId = Number(route?.snapshot.paramMap.get('batchId'));

    return {
      bookId: Number.isNaN(bookId) ? null : bookId,
      batchId: Number.isNaN(batchId) ? null : batchId,
    };
  });

  readonly batchBookNav = signal<BatchBookNav | null>(null);
  readonly loadingBookNav = signal(false);

  constructor() {
    effect(() => {
      const { bookId, batchId } = this.currentRouteParams();

      if (!bookId || !batchId) {
        this.batchBookNav.set(null);
        return;
      }

      this.loadBatchBookNav(batchId, bookId);
    });
  }

  private loadBatchBookNav(batchId: number, bookId: number) {
    this.loadingBookNav.set(true);

    this.batches.getBatch(batchId.toString()).subscribe({
      next: (batch) => {
        const ids = batch.book_ids ?? [];
        const currentIndex = ids.indexOf(bookId);

        if (currentIndex === -1) {
          this.batchBookNav.set(null);
          this.loadingBookNav.set(false);
          return;
        }

        this.batchBookNav.set({
          batchId,
          prevBookId: ids[currentIndex - 1] ?? null,
          nextBookId: ids[currentIndex + 1] ?? null,
        });

        this.loadingBookNav.set(false);
      },
      error: () => {
        this.batchBookNav.set(null);
        this.loadingBookNav.set(false);
      },
    });
  }

  goToPrevBook() {
    const nav = this.batchBookNav();
    if (!nav?.prevBookId) return;

    this.diff.setEnabled(false);
    this.cps.setMode('records');
    this.router.navigate(['/batches', nav.batchId, 'books', nav.prevBookId]);
  }

  goToNextBook() {
    const nav = this.batchBookNav();
    if (!nav?.nextBookId) return;

    this.diff.setEnabled(false);
    this.cps.setMode('records');
    this.router.navigate(['/batches', nav.batchId, 'books', nav.nextBookId]);
  }

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
