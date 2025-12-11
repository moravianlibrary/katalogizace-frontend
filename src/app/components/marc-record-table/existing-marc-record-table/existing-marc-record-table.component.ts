import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { ExistingMarcRecord } from '../../../models/book';
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
}
