import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { ExtractedMarcRecord } from '../../../models/book';
import { RecordStore } from '../../../stores/record.store';
import { DiffIndex } from '../../../utils/marc-diff';
import { MarcDiffHelper } from '../../../utils/marc-diff-helper';
import { MarcRowLeaderComponent } from '../../marc-row/marc-row-leader/marc-row-leader.component';
import { MarcRowNormalComponent } from '../../marc-row/marc-row-normal/marc-row-normal.component';
import { MarcRowSpecialComponent } from '../../marc-row/marc-row-special/marc-row-special.component';

import { MarcDiffService } from '../../../services/marc-diff.service';
import { RecordStateService } from '../../../services/record-state.service';
import { isDiffableTag015to830 } from '../../../utils/marc-diff';

@Component({
  standalone: true,
  selector: 'app-extracted-marc-record-table',
  imports: [
    MarcRowSpecialComponent,
    MarcRowNormalComponent,
    MarcRowLeaderComponent,
    CommonModule,
  ],
  templateUrl: './extracted-marc-record-table.component.html',
})
export class ExtractedMarcRecordTableComponent {
  extractedRecord = input.required<ExtractedMarcRecord>();
  isDiffableTag015to830 = isDiffableTag015to830;

  store = inject(RecordStore);
  ds = inject(MarcDiffService);
  recordState = inject(RecordStateService);

  transformed = computed(() => this.store.extractedWithMeta());

  diffIndex = input<DiffIndex | null>(null);
  diffSide = input<'opened' | 'preview'>('opened');

  diff = computed(() => new MarcDiffHelper(this.diffIndex()));
}
