import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { ExtractedMarcRecord } from '../../../models/book';
import { RecordStore } from '../../../stores/record.store';
import { MarcRowLeaderComponent } from '../../marc-row/marc-row-leader/marc-row-leader.component';
import { MarcRowNormalComponent } from '../../marc-row/marc-row-normal/marc-row-normal.component';
import { MarcRowSpecialComponent } from '../../marc-row/marc-row-special/marc-row-special.component';

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

  store = inject(RecordStore);

  transformed = computed(() => this.store.extractedWithMeta());
}
