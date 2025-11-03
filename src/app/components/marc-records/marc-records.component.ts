import { Component, input, signal } from '@angular/core';
import { ExistingMarcRecord } from '../../models/book';
import { MarcRecordTableComponent } from '../marc-record-table/marc-record-table.component';

@Component({
  standalone: true,
  selector: 'app-marc-records-tabs',
  imports: [MarcRecordTableComponent],
  templateUrl: './marc-records.component.html',
})
export class MarcRecordsTabsComponent {
  existingRecords = input<ExistingMarcRecord[]>([]);
  activeIndex = signal(0);

  setActive(i: number) {
    this.activeIndex.set(i);
  }
}
