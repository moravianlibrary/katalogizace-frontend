import { ExistingMarcRecord, SubDiffIndex } from '@/app/models';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MarcDiffService } from '../../../services/marc-diff.service';
import { RecordStateService } from '../../../services/record-state.service';
import { isDiffableTag015to830 } from '../../../utils/marc-diff';
import { MarcRowControlComponent } from '../../marc-row/marc-row-control/marc-row-control.component';
import { MarcRowDataComponent } from '../../marc-row/marc-row-data/marc-row-data.component';
import { MarcRowLeaderComponent } from '../../marc-row/marc-row-leader/marc-row-leader.component';

@Component({
  standalone: true,
  selector: 'app-existing-marc-record-table',
  imports: [
    MarcRowControlComponent,
    MarcRowDataComponent,
    MarcRowLeaderComponent,
    CommonModule,
    TranslateModule,
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
