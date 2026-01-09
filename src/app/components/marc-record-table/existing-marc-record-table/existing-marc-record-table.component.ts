import { ExistingMarcRecord, SubDiffIndex } from '@/app/models';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MarcDiffService } from '../../../services/marc-diff.service';
import { RecordStateService } from '../../../services/record-state.service';
import { isDiffableTag015to830 } from '../../../utils/marc-diff';
import { MarcRowLeaderComponent } from '../../marc-row/marc-row-leader/marc-row-leader.component';
import { MarcRowNormalComponent } from '../../marc-row/marc-row-normal/marc-row-normal.component';
import { MarcRowSpecialComponent } from '../../marc-row/marc-row-special/marc-row-special.component';

@Component({
  standalone: true,
  selector: 'app-existing-marc-record-table',
  imports: [
    MarcRowSpecialComponent,
    MarcRowNormalComponent,
    MarcRowLeaderComponent,
    CommonModule,
  ],
  templateUrl: './existing-marc-record-table.component.html',
})
export class ExistingMarcRecordTableComponent {
  existingRecord = input.required<ExistingMarcRecord>();

  ds = inject(MarcDiffService);
  recordState = inject(RecordStateService);

  isDiffableTag015to830 = isDiffableTag015to830;

  diffIndex = input<SubDiffIndex | null>(null);
  diffSide = input<'opened' | 'preview'>('opened');
}
