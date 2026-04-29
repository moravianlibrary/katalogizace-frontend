import { ID } from '@/app/models';
import { QuickAddItem } from '@/app/models/shared/record-state';
import { BooksService } from '@/app/services/api/books.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { ToastService } from '@/app/services/toast.service';
import { RecordStore } from '@/app/stores/record.store';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../icon/icon.component';
import { QuickAddComponent } from '../quick-add/quick-add.component';

@Component({
  standalone: true,
  selector: 'app-main-panel-header',
  imports: [QuickAddComponent, TranslateModule, IconComponent],
  templateUrl: './main-panel-header.component.html',
})
export class MainPanelHeaderComponent {
  private books = inject(BooksService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private store = inject(RecordStore);
  recordState = inject(RecordStateService);

  bookId = input.required<ID>();
  canWrite = input<boolean>(false);
  isSaving = signal(false);

  quickAddItems = input.required<QuickAddItem[]>();
  quickAddClick = output<QuickAddItem>();

  canSaveRecord = computed(() => this.canWrite() && !!this.store.extracted());

  onQuickAdd(it: QuickAddItem) {
    if (!this.canWrite()) {
      return;
    }

    this.quickAddClick.emit(it);
  }

  onSave() {
    if (!this.canWrite()) {
      this.toast.show(
        this.translate.instant('messages.error.forbidden'),
        'error',
      );
      return;
    }

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
