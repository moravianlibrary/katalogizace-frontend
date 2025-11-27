import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { PaginatedBooksResponse, TaskState } from '../../models/book';
import { BooksService } from '../../services/books.service';
import { ToastService } from '../../services/toast.service';
import { WorkingPanelService } from '../../services/working-panel.service';

@Component({
  standalone: true,
  selector: 'app-books-list',
  imports: [NgClass, DatePipe],
  templateUrl: 'books-list.component.html',
})
export class BooksListComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private books = inject(BooksService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);
  private wps = inject(WorkingPanelService);

  isUploading = false;

  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  data = signal<PaginatedBooksResponse | null>(null);

  page = signal<number>(1);
  pageSize = signal<number>(20);

  totalPages = computed(() =>
    this.data()
      ? Math.max(1, Math.ceil(this.data()!.total / this.data()!.page_size))
      : 1,
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((qp) => {
      const p = Number(qp.get('page') ?? '1');
      const ps = Number(qp.get('page_size') ?? '20');
      this.page.set(isNaN(p) || p < 1 ? 1 : p);
      this.pageSize.set(isNaN(ps) || ps < 1 ? 20 : ps);
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.books
      .listBooks({
        page: this.page(),
        page_size: this.pageSize(),
        // state: undefined, batch_id: undefined // ľahko doplniteľné
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          this.data.set(resp);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Nepodařilo se načíst seznam knih.');
          console.error(err);
          this.loading.set(false);
        },
      });
  }

  goPrev() {
    if (!this.data() || !this.data()!.has_prev) return;
    const prevPage = Math.max(1, this.page() - 1);
    this.page.set(prevPage);
    this.navigateWithQuery({ page: prevPage });
  }

  goNext() {
    if (!this.data() || !this.data()!.has_next) return;
    const nextPage = this.page() + 1;
    this.page.set(nextPage);
    this.navigateWithQuery({ page: nextPage });
  }

  navigateWithQuery(partial: { page?: number; page_size?: number }) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: this.page(),
        page_size: this.pageSize(),
        ...partial,
      },
      queryParamsHandling: 'merge',
    });
  }

  stateBadgeClass(state?: TaskState | null) {
    switch (state) {
      case 'new':
        return 'bg-slate-100 text-slate-700';
      case 'scheduled':
        return 'bg-indigo-100 text-indigo-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'ready':
        return 'bg-amber-100 text-amber-800';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  open(id: string) {
    this.router.navigate(['/books', id]);
    this.wps.setMode('records');
  }

  onUploadImages(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);

    this.isUploading = true;

    this.books.uploadImages(files).subscribe({
      next: () => {
        this.toast.show('Obrázky byly úspěšně nahrány.', 'success');
      },
      error: () => {
        this.toast.show('Nahrávání obrázků se nezdařilo.', 'error');
      },
      complete: () => {
        this.isUploading = false;
        input.value = '';
      },
    });
  }
}
