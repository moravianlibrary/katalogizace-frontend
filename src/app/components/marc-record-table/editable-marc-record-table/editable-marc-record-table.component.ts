import { SubDiffIndex } from '@/app/models';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { FieldEditService } from '@/app/services/edit.service';
import { MarcDiffService } from '@/app/services/marc-diff.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { isDiffableTag015to830 } from '@/app/utils/marc-diff';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MarcRowControlComponent } from '../../marc-row/marc-row-control/marc-row-control.component';
import { MarcRowDataComponent } from '../../marc-row/marc-row-data/marc-row-data.component';
import { MarcRowLeaderComponent } from '../../marc-row/marc-row-leader/marc-row-leader.component';

@Component({
  standalone: true,
  selector: 'app-editable-marc-record-table',
  imports: [
    MarcRowControlComponent,
    MarcRowDataComponent,
    MarcRowLeaderComponent,
    CommonModule,
  ],
  templateUrl: './editable-marc-record-table.component.html',
})
export class EditableMarcRecordTableComponent {
  cps = inject(ContextPanelService);
  edit = inject(FieldEditService);

  ds = inject(MarcDiffService);
  recordState = inject(RecordStateService);

  isDiffableTag015to830 = isDiffableTag015to830;

  diffIndex = input<SubDiffIndex | null>(null);
  diffSide = input<'opened' | 'preview'>('opened');
}
