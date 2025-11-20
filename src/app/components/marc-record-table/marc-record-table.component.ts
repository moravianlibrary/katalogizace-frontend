import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { ExistingMarcRecord } from '../../models/book';
import { MarcRowLeaderComponent } from '../marc-row-leader/marc-row-leader.component';
import { MarcRowNormalComponent } from '../marc-row-normal/marc-row-normal.component';
import { MarcRowSpecialComponent } from '../marc-row-special/marc-row-special.component';

@Component({
  standalone: true,
  selector: 'app-marc-record-table',
  imports: [
    MarcRowSpecialComponent,
    MarcRowNormalComponent,
    MarcRowLeaderComponent,
    CommonModule,
  ],
  templateUrl: './marc-record-table.component.html',
})
export class MarcRecordTableComponent {
  record = input.required<ExistingMarcRecord>();
}
