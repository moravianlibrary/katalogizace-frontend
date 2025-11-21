import { Component, computed, effect, inject, input } from '@angular/core';
import { BookResultResponse } from '../../models/book';
import { RecordStateService } from '../../services/record-state.service';
import { ExtractedFieldsComponent } from '../extracted-fields/extracted-fields/extracted-fields.component';
import { MarcRecordTableComponent } from '../marc-record-table/marc-record-table.component';
import { NavigationButtonsComponent } from '../navigation-buttons/navigation-buttons.component';

@Component({
  standalone: true,
  selector: 'app-editing-panel',
  imports: [
    NavigationButtonsComponent,
    ExtractedFieldsComponent,
    MarcRecordTableComponent,
  ],
  templateUrl: './editing-panel.component.html',
})
export class EditingPanelComponent {
  result = input<BookResultResponse | null>(null);

  recordState = inject(RecordStateService);

  viewMode = this.recordState.viewMode;
  recordPreview = this.recordState.recordPreview;
  uiFields = this.recordState.uiFields;

  hasLastEdited = computed(() => !!this.result()?.last_edited_record);

  constructor() {
    effect(() => {
      const r = this.result();
      if (!r) {
        this.recordState.uiFields.set([]);
        return;
      }

      this.recordState.loadFromExtractedAndLast(
        r.extracted_marc_record ?? null,
        r.last_edited_record ?? null,
      );
    });
  }
}
