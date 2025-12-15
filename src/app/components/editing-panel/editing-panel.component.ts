import { Component, effect, inject, input } from '@angular/core';
import { UUID } from '../../models/book';
import { MarcDiffService } from '../../services/marc-diff.service';
import { RecordStateService } from '../../services/record-state.service';
import { RecordStore } from '../../stores/record.store';
import { ExtractedFieldsComponent } from '../extracted-fields/extracted-fields/extracted-fields.component';
import { ExistingMarcRecordTableComponent } from '../marc-record-table/existing-marc-record-table/existing-marc-record-table.component';
import { NavigationButtonsComponent } from '../navigation-buttons/navigation-buttons.component';

@Component({
  standalone: true,
  selector: 'app-editing-panel',
  imports: [
    NavigationButtonsComponent,
    ExtractedFieldsComponent,
    ExistingMarcRecordTableComponent,
  ],
  templateUrl: './editing-panel.component.html',
})
export class EditingPanelComponent {
  book_id = input<UUID>('');

  recordState = inject(RecordStateService);
  store = inject(RecordStore);
  diff = inject(MarcDiffService);

  viewMode = this.recordState.viewMode;
  recordPreview = this.recordState.recordPreview;
  uiFields = this.recordState.uiFields;

  diffIndex = this.diff.diffIndex;
  diffEnabled = this.diff.enabledByUser;

  constructor() {
    effect(() => {
      const e = this.store.extracted();
      const l = this.store.lastEdited();

      if (l) {
        this.recordState.loadFromExistingOrLastEdited(l);
      } else {
        this.recordState.loadFromExtracted(e);
      }
    });

    // auto turn off diff when leaving table view mode
    // effect(() => {
    //   if (this.recordState.viewMode() !== 'table') {
    //     this.diff.setEnabled(false);
    //   }
    // });
  }
}
