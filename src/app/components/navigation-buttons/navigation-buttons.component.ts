import { Component, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BooksService } from '../../services/books.service';
import { RecordStateService } from '../../services/record-state.service';
import { ToastService } from '../../services/toast.service';
import { WorkingPanelService } from '../../services/working-panel.service';

@Component({
  selector: 'app-navigation-buttons',
  imports: [],
  templateUrl: './navigation-buttons.component.html',
})
export class NavigationButtonsComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private wps = inject(WorkingPanelService);

  bookId = input.required<string>();

  private books = inject(BooksService);
  private toast = inject(ToastService);
  recordState = inject(RecordStateService);

  isSaving = signal(false);

  goBack() {
    this.wps.showRecords();
    this.recordState.resetViewMode();

    this.router
      .navigate(['..'], {
        relativeTo: this.route,
        queryParamsHandling: 'preserve',
      })
      .catch(() => {
        this.router.navigate(['/books']);
      });
  }

  addField() {
    this.recordState.addField();
  }

  onSave() {
    const bookId = this.bookId();
    const record = this.recordState.buildExistingRecord(bookId);

    if (!record) {
      this.toast.show('Není co uložit - chybí MARC záznam.', 'error');
      return;
    }

    this.isSaving.set(true);

    this.books.submitRevision(bookId, record).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.show('Záznam byl úspěšně uložen.', 'success');
      },
      error: (err) => {
        console.error(err);
        this.isSaving.set(false);
        this.toast.show('Uložení záznamu selhalo.', 'error');
      },
    });
  }

  toggleView() {
    this.recordState.toggleViewMode();
  }
}
