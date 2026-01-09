import {
  BatchDto,
  PaginatedBooksResponseDto,
  ProcessState,
  RecordState,
} from '@/app/models';
import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { ProcessStateLabelPipe } from '../../pipes/process-state-label.pipe';
import { RecordStateLabelPipe } from '../../pipes/record-state-label.pipe';
import { BatchesService } from '../../services/api/batches.service';
import { BooksService } from '../../services/api/books.service';
import { ToastService } from '../../services/toast.service';
import { WorkingPanelService } from '../../services/working-panel.service';

@Component({
  standalone: true,
  selector: 'app-books-list',
  imports: [
    NgClass,
    DatePipe,
    RouterModule,
    RecordStateLabelPipe,
    ProcessStateLabelPipe,
  ],
  templateUrl: 'books-list.component.html',
})
export class BooksListComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private books = inject(BooksService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);
  private wps = inject(WorkingPanelService);
  private batchesService = inject(BatchesService);

  isUploading = false;

  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  data = signal<PaginatedBooksResponseDto | null>(null);

  batchId = signal<string | null>(null);
  batch = signal<BatchDto | null>(null);

  page = signal<number>(1);
  pageSize = signal<number>(20);

  totalPages = computed(() =>
    this.data()
      ? Math.max(1, Math.ceil(this.data()!.total / this.data()!.page_size))
      : 1,
  );

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([pm, qp]) => {
        const bid = pm.get('batchId');
        this.batchId.set(bid);

        const p = Number(qp.get('page') ?? '1');
        const ps = Number(qp.get('page_size') ?? '20');
        this.page.set(isNaN(p) || p < 1 ? 1 : p);
        this.pageSize.set(isNaN(ps) || ps < 1 ? 20 : ps);

        if (bid) {
          this.batchesService.getBatch(bid).subscribe({
            next: (resp) => this.batch.set(resp),
            error: (err) => {
              this.error.set('Nepodařilo se načíst informace o dávce');
              console.error(err);
            },
          });
        } else {
          this.batch.set(null);
        }

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
        batch_id: this.batchId()!,
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

  processStateBadgeClass(state?: ProcessState | null) {
    switch (state) {
      case 'created':
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

  recordStateBadgeClass(state?: RecordState | null) {
    switch (state) {
      case 'new':
        return 'bg-slate-100 text-slate-700';
      case 'edited':
        return 'bg-blue-100 text-blue-700';
      case 'reviewed':
        return 'bg-amber-100 text-amber-800';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  open(id: string) {
    const bid = this.batchId();

    if (bid) {
      this.router.navigate(['/batches', bid, 'books', id]);
    } else {
      this.router.navigate(['/batches']);
    }

    this.wps.setMode('records');
  }

  onUploadImages(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);

    this.isUploading = true;

    this.books.uploadImages(files, this.batchId()!).subscribe({
      next: () => {
        this.toast.show('Obrázky byly úspěšně nahrány.', 'success');
        this.load();
      },
      error: () => {
        this.toast.show('Nahrávání obrázků se nezdařilo.', 'error');
        this.isUploading = false;
        input.value = '';
      },
      complete: () => {
        this.isUploading = false;
        input.value = '';
      },
    });
  }

  onDelete(id: string, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    const confirmed = confirm('Opravdu chcete smazat tuto knihu?');
    if (!confirmed) return;

    this.books.deleteBookRecord(id).subscribe({
      next: () => {
        this.toast.show('Kniha byla úspěšně smazána.', 'success');
        this.load();
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Smazání knihy se nezdařilo.', 'error');
      },
    });
  }
}
