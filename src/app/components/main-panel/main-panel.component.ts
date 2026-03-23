import { ID } from '@/app/models';
import { Component, effect, inject, input } from '@angular/core';
import { MarcDiffService } from '../../services/marc-diff.service';
import { RecordStateService } from '../../services/record-state.service';
import { RecordStore } from '../../stores/record.store';
import { ExtractedFieldsComponent } from '../extracted-fields/extracted-fields/extracted-fields.component';

import { QuickAddItem } from '@/app/models/shared/record-state';
import { ContextPanelService } from '@/app/services/context-panel.service';
import {
  existingToEditableWithMeta,
  extractedToEditableWithMeta,
} from '@/app/utils/marc-transform';
import { EditableMarcRecordTableComponent } from '../marc-record-table/editable-marc-record-table/editable-marc-record-table.component';
import { MainPanelHeaderComponent } from './main-panel-header/main-panel-header.component';

@Component({
  standalone: true,
  selector: 'app-main-panel',
  imports: [
    MainPanelHeaderComponent,
    ExtractedFieldsComponent,
    EditableMarcRecordTableComponent,
  ],
  templateUrl: './main-panel.component.html',
})
export class MainPanelComponent {
  book_id = input<ID | null>(null);

  recordState = inject(RecordStateService);
  store = inject(RecordStore);
  diff = inject(MarcDiffService);
  cps = inject(ContextPanelService);

  viewMode = this.recordState.viewMode;
  recordPreview = this.recordState.recordPreview;

  diffIndex = this.diff.diffIndex;

  onQuickAdd(it: QuickAddItem) {
    if (it.action === 'add-field') {
      //this.addField();
      return;
    }

    if (
      it.tag == null ||
      it.type == null ||
      it.subfields == null ||
      it.ind1 == null ||
      it.ind2 == null
    ) {
      return;
    }

    this.recordState.addFieldWithTag(
      it.tag,
      it.type,
      it.subfields,
      it.ind1,
      it.ind2,
    );

    const selected = this.recordState.selectedFieldId();
    if (!selected) return;

    this.cps.setMode('edit', {
      tag: String(it.tag).padStart(3, '0'),
      fieldId: selected,
    });
  }

  constructor() {
    effect(() => {
      const e = this.store.extracted();
      const l = this.store.lastEdited();

      const editable = l
        ? existingToEditableWithMeta(l)
        : extractedToEditableWithMeta(e);

      this.recordState.setEditableRecord(editable);
    });

    // auto turn off diff when leaving table view mode
    // effect(() => {
    //   if (this.recordState.viewMode() !== 'table') {
    //     this.diff.setEnabled(false);
    //   }
    // });
  }
}
