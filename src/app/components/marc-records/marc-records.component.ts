import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { ExistingMarcRecord, ExtractedMarcRecord } from '../../models/book';
import { RecordStateService } from '../../services/record-state.service';
import { extractedToExisting } from '../../utils/marc-transform';
import { MarcRecordTableComponent } from '../marc-record-table/marc-record-table.component';

@Component({
  standalone: true,
  selector: 'app-marc-records',
  imports: [MarcRecordTableComponent, CommonModule],
  templateUrl: './marc-records.component.html',
})
export class MarcRecordsComponent {
  existingRecords = input<ExistingMarcRecord[]>([]);
  extractedRecord = input<ExtractedMarcRecord | null>(null);

  private recordState = inject(RecordStateService);

  records = computed<ExistingMarcRecord[]>(() => {
    const list: ExistingMarcRecord[] = [];
    const extracted = extractedToExisting(this.extractedRecord());

    if (extracted) {
      list.push(extracted);
    }
    list.push(...this.existingRecords());
    return list;
  });

  expandedIndex = signal<number | null>(0);

  toggleRow(index: number) {
    this.expandedIndex.update((current) => (current === index ? null : index));
  }

  getAuthorName(rec: ExistingMarcRecord): string {
    const f100 = rec.normal_fields?.find((f) => f.tag === '100');
    if (!f100) return '';
    return f100.subfields?.find((sf) => sf.code === 'a')?.value ?? '';
  }

  getAuthorYears(rec: ExistingMarcRecord): string {
    const f100 = rec.normal_fields?.find((f) => f.tag === '100');
    if (!f100) return '';
    return f100.subfields?.find((sf) => sf.code === 'd')?.value ?? '';
  }

  onTakeRecord() {
    this.recordState.loadFromExtracted(this.extractedRecord());
  }
}
