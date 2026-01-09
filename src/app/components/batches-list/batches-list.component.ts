import { DatePipe, NgClass } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';

import {
  BatchDto,
  BatchState,
  PaginatedBatchesResponseDto,
} from '@/app/models';
import { BatchStateLabelPipe } from '../../pipes/batch-state-label.pipe';
import { BatchesService } from '../../services/api/batches.service';
import { ToastService } from '../../services/toast.service';

@Component({
  standalone: true,
  selector: 'app-batches-list',
  imports: [DatePipe, RouterModule, NgClass, BatchStateLabelPipe],
  templateUrl: './batches-list.component.html',
})
export class BatchesListComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private batches = inject(BatchesService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<PaginatedBatchesResponseDto | null>(null);

  filterMine = signal(false);

  page = signal<number>(1);
  pageSize = signal<number>(20);

  totalPages = computed(() =>
    this.data()
      ? Math.max(1, Math.ceil(this.data()!.total / this.data()!.page_size))
      : 1,
  );

  rows = computed<BatchDto[]>(() => this.data()?.batches ?? []);

  newName = signal('');
  newDescription = signal('');
  creating = signal(false);

  editingBatch = signal<BatchDto | null>(null);
  editName = signal('');
  editDescription = signal('');
  savingEdit = signal(false);

  @ViewChild('editDialog', { static: true })
  editDialog!: ElementRef<HTMLDialogElement>;

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([_, qp]) => {
        const p = Number(qp.get('page') ?? '1');
        const ps = Number(qp.get('page_size') ?? '20');

        this.page.set(isNaN(p) || p < 1 ? 1 : p);
        this.pageSize.set(isNaN(ps) || ps < 1 ? 20 : ps);

        const mine = qp.get('mine');
        if (mine === '1' || mine === 'true') this.filterMine.set(true);
        if (mine === '0' || mine === 'false') this.filterMine.set(false);

        this.load();
      });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.batches
      .listBatches({
        filter_owned_by_user: this.filterMine(),
        page: this.page(),
        page_size: this.pageSize(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          this.data.set(resp);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.loading.set(false);
          this.error.set('Nepodařilo se načíst seznam dávek.');
          this.toast.show('Nepodařilo se načíst seznam dávek.', 'error');
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

  navigateWithQuery(partial: {
    page?: number;
    page_size?: number;
    mine?: string;
  }) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: this.page(),
        page_size: this.pageSize(),
        mine: this.filterMine() ? '1' : '0',
        ...partial,
      },
      queryParamsHandling: 'merge',
    });
  }

  toggleMine() {
    this.filterMine.update((v) => !v);
    this.page.set(1);
    this.navigateWithQuery({ page: 1, mine: this.filterMine() ? '1' : '0' });
  }

  open(batchId: string) {
    this.router.navigate(['/batches', batchId, 'books']);
  }

  countBooks(b: BatchDto) {
    return b.book_ids?.length ?? 0;
  }

  onDelete(batchId: string, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    const confirmed = confirm('Opravdu chcete smazat tuto dávku?');
    if (!confirmed) return;

    this.batches.deleteBatch(batchId).subscribe({
      next: () => {
        this.toast.show('Dávka byla úspěšně smazána.', 'success');
        this.load();
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Smazání dávky se nezdařilo.', 'error');
      },
    });
  }

  onNameInput(event: Event) {
    this.newName.set((event.target as HTMLInputElement).value);
  }

  onDescriptionInput(event: Event) {
    this.newDescription.set((event.target as HTMLInputElement).value);
  }

  createBatch() {
    const name = this.newName().trim();
    const description = this.newDescription().trim();

    if (!name || this.creating()) {
      this.toast.show('Zadejte název dávky.', 'error');
      return;
    }

    this.creating.set(true);

    this.batches.createBatch(name, description ? description : null).subscribe({
      next: (batch) => {
        this.toast.show('Dávka byla vytvořena.', 'success');
        this.newName.set('');
        this.newDescription.set('');
        this.creating.set(false);

        this.router.navigate(['/batches', batch.batch_id, 'books']);
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Vytvoření dávky se nezdařilo.', 'error');
        this.creating.set(false);
      },
    });
  }

  batchStateBadgeClass(state?: BatchState | null) {
    switch (state) {
      case 'created':
        return 'bg-slate-100 text-slate-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  onEditNameInput(event: Event) {
    this.editName.set((event.target as HTMLInputElement).value);
  }

  onEditDescriptionInput(event: Event) {
    this.editDescription.set((event.target as HTMLInputElement).value);
  }

  openEdit(b: BatchDto, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    this.editingBatch.set(b);
    this.editName.set((b.name ?? '').trim());
    this.editDescription.set((b.description ?? '').trim());

    this.editDialog.nativeElement.showModal();
  }

  closeEdit() {
    if (this.editDialog?.nativeElement.open) {
      this.editDialog.nativeElement.close();
    }

    this.editingBatch.set(null);
    this.editName.set('');
    this.editDescription.set('');
    this.savingEdit.set(false);
  }

  saveEdit() {
    const b = this.editingBatch();
    if (!b || this.savingEdit()) return;

    const name = this.editName().trim();
    const descRaw = this.editDescription().trim();
    const description: string | null = descRaw ? descRaw : null;

    if (!name) {
      this.toast.show('Název dávky je povinný', 'warning');
      return;
    }

    this.savingEdit.set(true);

    this.batches
      .updateBatch(b.batch_id, {
        name,
        description,
      })
      .subscribe({
        next: () => {
          this.toast.show('Dávka byla upravena.', 'success');
          this.closeEdit();
          this.load();
        },
        error: (err) => {
          console.error(err);
          this.toast.show('Uložení změn se nezdařilo.', 'error');
          this.savingEdit.set(false);
        },
      });
  }
}
