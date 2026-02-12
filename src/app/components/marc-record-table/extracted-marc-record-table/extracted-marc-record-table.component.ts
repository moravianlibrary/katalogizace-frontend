import { ExtractedMarcRecord, SubDiffIndex } from '@/app/models';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RecordStore } from '../../../stores/record.store';
import { MarcRowControlComponent } from '../../marc-row/marc-row-control/marc-row-control.component';
import { MarcRowLeaderComponent } from '../../marc-row/marc-row-leader/marc-row-leader.component';
import { MarcRowNormalComponent } from '../../marc-row/marc-row-normal/marc-row-normal.component';

import { MarcDiffService } from '../../../services/marc-diff.service';
import { RecordStateService } from '../../../services/record-state.service';
import { isDiffableTag015to830 } from '../../../utils/marc-diff';

@Component({
  standalone: true,
  selector: 'app-extracted-marc-record-table',
  imports: [
    MarcRowControlComponent,
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

  transformed = computed(() => this.store.openedExtractedWithMeta());

  diffIndex = input<SubDiffIndex | null>(null);
  diffSide = input<'opened' | 'preview'>('opened');
}
