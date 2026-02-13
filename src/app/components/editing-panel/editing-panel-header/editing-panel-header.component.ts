import { ID, RecordViewMode } from '@/app/models';
import { QuickAddItem } from '@/app/models/shared/record-state';
import { BooksService } from '@/app/services/api/books.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { ToastService } from '@/app/services/toast.service';
import { NgClass } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QuickAddComponent } from '../quick-add/quick-add.component';

@Component({
  standalone: true,
  selector: 'app-editing-panel-header',
  imports: [QuickAddComponent, TranslateModule, NgClass],
  templateUrl: './editing-panel-header.component.html',
})
export class EditingPanelHeaderComponent {
  private books = inject(BooksService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  recordState = inject(RecordStateService);

  bookId = input.required<ID>();
  viewMode = input.required<RecordViewMode>();
  isSaving = signal(false);
  setViewMode = output<RecordViewMode>();

  // table mode
  quickAddItems = input.required<QuickAddItem[]>();
  quickAddClick = output<QuickAddItem>();

  // cards mode
  addDataField = output<void>();
  addControlField = output<void>();

  onQuickAdd(it: QuickAddItem) {
    this.quickAddClick.emit(it);
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
}
