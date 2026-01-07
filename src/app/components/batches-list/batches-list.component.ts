import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';

import { Batch, BatchesResponse, BatchState } from '../../models/book';
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
  private router = inject(Router);
  private batches = inject(BatchesService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<BatchesResponse | null>(null);

  filterMine = signal(false);

  rows = computed<Batch[]>(() => this.data()?.batches ?? []);
  totalCount = computed(() => this.data()?.total_count ?? 0);

  newName = signal('');
  newDescription = signal('');
  creating = signal(false);

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.batches
      .listBatches({ filter_owned_by_user: this.filterMine() })
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

  ngOnInit() {
    this.load();
  }

  toggleMine() {
    this.filterMine.update((v) => !v);
    this.load();
  }

  open(batchId: string) {
    this.router.navigate(['/batches', batchId, 'books']);
  }

  countBooks(b: Batch) {
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
    const value = (event.target as HTMLInputElement).value;
    this.newName.set(value);
  }

  onDescriptionInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.newDescription.set(value);
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
        this.load();
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
}
