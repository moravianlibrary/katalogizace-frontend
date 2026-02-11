import { ID } from '@/app/models';
import { Component, HostListener, inject, input, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BooksService } from '../../services/api/books.service';
import { RecordStateService } from '../../services/record-state.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-navigation-buttons',
  imports: [],
  templateUrl: './navigation-buttons.component.html',
})
export class NavigationButtonsComponent {
  bookId = input.required<ID>();

  private books = inject(BooksService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  recordState = inject(RecordStateService);

  isSaving = signal(false);

  showAddMenu = signal(false);

  toggleAddMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showAddMenu.update((v) => !v);
  }

  @HostListener('document:click')
  closeAddMenu() {
    this.showAddMenu.set(false);
  }

  addNormalField() {
    this.showAddMenu.set(false);
    this.recordState.addField('normal');
  }

  addSpecialField() {
    this.showAddMenu.set(false);
    this.recordState.addField('special');
  }

  onSave() {
    const bookId = this.bookId();
    const record = this.recordState.buildExistingRecord(bookId);

    if (!record) {
      this.toast.show(
        this.translate.instant('messages.warning.record.empty'),
        'warning',
      );
      return;
    }

    this.isSaving.set(true);

    this.books.submitRevision(bookId.toString(), record).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.show(
          this.translate.instant('messages.success.record.save'),
          'success',
        );
      },
      error: (err) => {
        console.error(err);
        this.isSaving.set(false);
        this.toast.show(
          this.translate.instant('messages.error.record.save'),
          'error',
        );
      },
    });
  }

  toggleView() {
    this.recordState.toggleViewMode();
  }
}
