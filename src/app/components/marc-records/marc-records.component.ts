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

  getTitle(rec: ExistingMarcRecord): string | null {
    const f245 = rec.normal_fields?.find((f) => f.tag === '245');
    if (!f245) return '';
    return f245.subfields?.find((sf) => sf.code === 'a')?.value ?? '';
  }

  getAuthorName(rec: ExistingMarcRecord): string {
    const f100 = rec.normal_fields?.find((f) => f.tag === '100');
    if (!f100) return '';
    return f100.subfields?.find((sf) => sf.code === 'a')?.value ?? '';
  }

  getPublicationYear(rec: ExistingMarcRecord): string {
    const f264 = rec.normal_fields?.find((f) => f.tag === '264');
    if (f264) {
      const sf264 = f264.subfields?.find((sf) => sf.code === 'c')?.value ?? '';
      if (sf264 !== '') {
        return sf264;
      }
    }

    const f260 = rec.normal_fields?.find((f) => f.tag === '260');
    if (f260) {
      const sf260 = f260.subfields?.find((sf) => sf.code === 'c')?.value ?? '';
      if (sf260 !== '') {
        return sf260;
      }
    }

    return '';
  }

  onTakeRecord() {
    this.recordState.loadFromExtracted(this.extractedRecord());
  }
}
