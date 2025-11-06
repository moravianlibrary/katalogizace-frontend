import { Component, computed, input, signal } from '@angular/core';
import { ExistingMarcRecord, ExtractedMarcRecord } from '../../models/book';
import { extractedToExisting } from '../../utils/marc-transform';
import { MarcRecordTableComponent } from '../marc-record-table/marc-record-table.component';

@Component({
  standalone: true,
  selector: 'app-marc-records',
  imports: [MarcRecordTableComponent],
  templateUrl: './marc-records.component.html',
})
export class MarcRecordsComponent {
  existingRecords = input<ExistingMarcRecord[]>([]);
  extractedRecord = input<ExtractedMarcRecord | null>(null);

  activeIndex = signal(0);

  records = computed<ExistingMarcRecord[]>(() => {
    const list: ExistingMarcRecord[] = [];
    const extracted = extractedToExisting(this.extractedRecord());

    if (extracted) {
      list.push(extracted);
    }
    list.push(...this.existingRecords());
    return list;
  });

  setActive(i: number) {
    this.activeIndex.set(i);
  }
}
