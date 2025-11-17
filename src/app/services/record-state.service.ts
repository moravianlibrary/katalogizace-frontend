import { Injectable, signal } from '@angular/core';
import {
  ExistingMarcRecordNormalField,
  ExtractedMarcRecord,
  LastEditedRecord,
  UiFieldWithMeta,
} from '../models/book';
import { extractedToUiFields } from '../utils/marc-transform';

@Injectable({ providedIn: 'root' })
export class RecordStateService {
  readonly uiFields = signal<UiFieldWithMeta[]>([]);

  loadFromExtracted(extracted: ExtractedMarcRecord | null) {
    if (!extracted) {
      this.uiFields.set([]);
      return;
    }

    // ! zatiaľ bez special fields – rovnako ako doteraz
    const fields = extractedToUiFields(extracted, false);
    this.uiFields.set(fields);
  }

  loadFromExtractedAndLast(
    extracted: ExtractedMarcRecord | null,
    lastEdited: LastEditedRecord | null,
  ) {
    if (!extracted) {
      this.uiFields.set([]);
      return;
    }

    const fields = extractedToUiFields(extracted, false);

    if (lastEdited && lastEdited.normal_fields?.length) {
      const byTag: Record<string, ExistingMarcRecordNormalField[]> = {};

      for (const nf of lastEdited.normal_fields) {
        if (!byTag[nf.tag]) byTag[nf.tag] = [];
        byTag[nf.tag].push(nf);
      }

      const counters: Record<string, number> = {};

      for (const f of fields) {
        const list = byTag[f.tag];
        if (!list || list.length === 0) continue;

        const idx = counters[f.tag] ?? 0;
        if (idx >= list.length) continue;

        const edited = list[idx];
        counters[f.tag] = idx + 1;

        f.ind1 = edited.ind1 ?? '';
        f.ind2 = edited.ind2 ?? '';
        f.subfields = edited.subfields ?? [];
      }
    }

    this.uiFields.set(fields);
  }

  buildExistingRecord(bookId: string): LastEditedRecord | null {
    const fields = this.uiFields();
    if (!fields.length) return null;

    return {
      record_id: `frontend-${bookId}`,
      leader: '',
      source: 'user_edit',
      quality_assessment: {
        required_present: 0,
        required_total: 0,
        required_if_applicable_present: 0,
        required_if_applicable_total: 0,
      },
      special_fields: [],
      normal_fields: fields.map((f) => ({
        tag: f.tag,
        ind1: f.ind1 ?? '',
        ind2: f.ind2 ?? '',
        subfields: f.subfields ?? [],
      })),
    };
  }
}
