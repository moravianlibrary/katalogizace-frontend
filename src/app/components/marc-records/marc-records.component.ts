import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ExistingMarcRecord, ExtractedMarcRecord } from '../../models/book';
import { MarcDiffService } from '../../services/marc-diff.service';
import { RecordStateService } from '../../services/record-state.service';
import { WorkingPanelService } from '../../services/working-panel.service';
import { RecordStore } from '../../stores/record.store';
import { filterExistingRecord015to830 } from '../../utils/marc-filter';
import { extractedToExisting } from '../../utils/marc-transform';
import { ExistingMarcRecordTableComponent } from '../marc-record-table/existing-marc-record-table/existing-marc-record-table.component';
import { ExtractedMarcRecordTableComponent } from '../marc-record-table/extracted-marc-record-table/extracted-marc-record-table.component';
interface RecordType {
  extracted: ExtractedMarcRecord | null;
  existing: ExistingMarcRecord | null;
}

@Component({
  standalone: true,
  selector: 'app-marc-records',
  imports: [
    ExistingMarcRecordTableComponent,
    CommonModule,
    ExtractedMarcRecordTableComponent,
  ],
  templateUrl: './marc-records.component.html',
})
export class MarcRecordsComponent {
  store = inject(RecordStore);
  private recordState = inject(RecordStateService);

  private wps = inject(WorkingPanelService);

  existingRecords = this.store.existingRecords;
  extractedRecord = this.store.extracted;

  transformed = computed(() => {
    return extractedToExisting(this.extractedRecord());
  });

  private diff = inject(MarcDiffService);
  diffIndex = this.diff.diffIndex;

  records = computed<RecordType[]>(() => {
    const list: RecordType[] = [];
    const extracted = this.extractedRecord();

    if (extracted) {
      list.push({
        extracted: extracted,
        existing: null,
      });
    }

    for (const rec of this.existingRecords()) {
      list.push({
        extracted: null,
        existing: rec,
      });
    }

    return list;
  });

  expandedIndex = signal<number | null>(0);

  private lastAppliedKey: string | null = null;

  constructor() {
    // nastav default otvorený record (keď sa načítajú records)
    effect(() => {
      const idx = this.expandedIndex();
      const list = this.records();

      if (idx == null || !list[idx]) {
        this.store.setOpenedExisting(null);
        this.store.setOpenedExtracted(null);
        return;
      }

      const item = list[idx];
      if (item.existing) {
        this.store.setOpenedExisting(item.existing);
        return;
      }

      if (item.extracted) {
        this.store.setOpenedExtracted(item.extracted);
        return;
      }

      this.store.setOpenedExisting(null);
      this.store.setOpenedExtracted(null);
    });

    effect(() => {
      const evt = this.wps.applyCandidate();
      if (!evt) return;

      const key = `${evt.fieldId}:${evt.candidate.id}`;
      if (this.lastAppliedKey === key) return;
      this.lastAppliedKey = key;

      this.recordState.applyCandidateToUiField({
        fieldId: evt.fieldId,
        candidate: evt.candidate,
      });

      this.store.applyCandidateToOpenedExtracted(evt.fieldId, evt.candidate);

      this.wps.applyCandidate.set(null);
    });
  }

  toggleRow(index: number) {
    this.expandedIndex.update((current) => (current === index ? null : index));
  }

  getTitle(rec: ExistingMarcRecord | null): string | null {
    if (!rec) {
      return null;
    }

    const f245 = rec.normal_fields?.find((f) => f.tag === '245');
    if (!f245) return '';
    return f245.subfields?.find((sf) => sf.code === 'a')?.value ?? '';
  }

  getAuthorName(rec: ExistingMarcRecord | null): string | null {
    if (!rec) {
      return null;
    }

    const f100 = rec.normal_fields?.find((f) => f.tag === '100');
    if (!f100) return '';
    return f100.subfields?.find((sf) => sf.code === 'a')?.value ?? '';
  }

  getPublicationYear(rec: ExistingMarcRecord | null): string | null {
    if (!rec) {
      return null;
    }

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
    const idx = this.expandedIndex();
    if (idx === null) {
      return;
    }

    const rec = this.records()[idx];
    if (!rec) {
      return;
    }

    if (idx === 0) {
      this.recordState.loadFromExtracted(rec.extracted);
    } else {
      const filtered = filterExistingRecord015to830(rec.existing!);
      this.recordState.loadFromExistingOrLastEdited(filtered);
    }
  }
}
