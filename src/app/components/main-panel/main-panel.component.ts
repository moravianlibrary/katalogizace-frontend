import { ID } from '@/app/models';
import { Component, effect, inject, input } from '@angular/core';
import { MarcDiffService } from '../../services/marc-diff.service';
import { RecordStateService } from '../../services/record-state.service';
import { RecordStore } from '../../stores/record.store';
import { ExtractedFieldsComponent } from '../extracted-fields/extracted-fields/extracted-fields.component';
import { ExistingMarcRecordTableComponent } from '../marc-record-table/existing-marc-record-table/existing-marc-record-table.component';

import { QuickAddItem } from '@/app/models/shared/record-state';
import { MainPanelHeaderComponent } from './main-panel-header/main-panel-header.component';

@Component({
  standalone: true,
  selector: 'app-main-panel',
  imports: [
    MainPanelHeaderComponent,
    ExtractedFieldsComponent,
    ExistingMarcRecordTableComponent,
  ],
  templateUrl: './main-panel.component.html',
})
export class MainPanelComponent {
  book_id = input<ID | null>(null);

  recordState = inject(RecordStateService);
  store = inject(RecordStore);
  diff = inject(MarcDiffService);

  viewMode = this.recordState.viewMode;
  recordPreview = this.recordState.recordPreview;

  diffIndex = this.diff.diffIndex;

  onQuickAdd(it: QuickAddItem) {
    this.recordState.addFieldWithTag(it.tag, it.type);
  }

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
