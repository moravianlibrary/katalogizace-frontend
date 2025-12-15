import { computed, Injectable, signal } from '@angular/core';
import {
  ExistingMarcRecord,
  ExtractedMarcRecord,
  LastEditedRecord,
  Step,
} from '../models/book';
import { extractedToExistingWithMeta } from '../utils/marc-transform';

@Injectable()
export class RecordStore {
  readonly extracted = signal<ExtractedMarcRecord | null>(null);
  readonly lastEdited = signal<LastEditedRecord | null>(null);
  readonly existingRecords = signal<ExistingMarcRecord[]>([]);
  readonly provenance = signal<Record<string, Step[]>>({});

  readonly hasLastEdited = computed(() => !!this.lastEdited());

  readonly openedRecord = signal<ExistingMarcRecord | null>(null);

  setOpenedRecord(rec: ExistingMarcRecord | null) {
    this.openedRecord.set(rec);
  }

  extractedWithMeta = computed(() =>
    extractedToExistingWithMeta(this.extracted()),
  );

  setExtracted(rec: ExtractedMarcRecord | null) {
    this.extracted.set(rec);
  }

  setLastEdited(rec: LastEditedRecord | null) {
    this.lastEdited.set(rec);
  }

  setExistingRecords(recs: ExistingMarcRecord[]) {
    this.existingRecords.set(recs ?? []);
  }

  setProvenance(p: Record<string, Step[]>) {
    this.provenance.set(p);
  }
}
