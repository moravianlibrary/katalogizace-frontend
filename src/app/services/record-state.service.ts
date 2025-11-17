import { Injectable, signal } from '@angular/core';
import {
  ExistingMarcRecordNormalField,
  ExtractedMarcRecord,
  LastEditedRecord,
  UiFieldWithMeta,
} from '../models/book';
import { extractedToUiFields } from '../utils/marc-transform';

let manualFieldCounter = 0;
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

    if (!lastEdited?.normal_fields?.length) {
      this.uiFields.set(fields);
      return;
    }

    const byTag: Record<string, ExistingMarcRecordNormalField[]> = {};
    for (const nf of lastEdited.normal_fields) {
      if (!byTag[nf.tag]) byTag[nf.tag] = [];
      byTag[nf.tag].push(nf);
    }

    const counters: Record<string, number> = {};
    const used = new Set<ExistingMarcRecordNormalField>();

    for (const f of fields) {
      const list = byTag[f.tag];
      if (!list || list.length === 0) continue;

      const idx = counters[f.tag] ?? 0;
      if (idx >= list.length) continue;

      const edited = list[idx];
      counters[f.tag] = idx + 1;
      used.add(edited);

      f.ind1 = edited.ind1 ?? '';
      f.ind2 = edited.ind2 ?? '';
      f.subfields = edited.subfields ?? [];
    }

    for (const nf of lastEdited.normal_fields) {
      if (used.has(nf)) continue;

      fields.push({
        extractedFieldId: '',
        tag: nf.tag,
        ind1: nf.ind1 ?? '',
        ind2: nf.ind2 ?? '',
        subfields: nf.subfields ?? [],

        candidateId: '',
        score: 0,
        candidates: [],
        isManual: true,
      } as UiFieldWithMeta);
    }

    this.uiFields.set(fields);
  }

  addField() {
    const current = this.uiFields();

    const newField: UiFieldWithMeta = {
      extractedFieldId: `manual-${manualFieldCounter++}`,
      tag: '',
      ind1: '',
      ind2: '',
      subfields: [],
      candidateId: '',
      candidates: [],
      score: 0,
      isManual: true,
    };

    this.uiFields.set([...current, newField]);
  }

  buildExistingRecord(bookId: string): LastEditedRecord | null {
    const fields = this.uiFields();
    if (!fields.length) return null;

    const normalFields = fields
      .filter((f) => f.tag.trim().length === 3)
      .map((f) => {
        const cleanedSubfields = (f.subfields ?? []).filter(
          (sf) => sf.code.trim().length === 1 && sf.value.trim().length > 0,
        );

        return {
          tag: f.tag.trim(),
          ind1: f.ind1?.trim() ?? '',
          ind2: f.ind2?.trim() ?? '',
          subfields: cleanedSubfields,
        };
      })
      .filter((nf) => nf.subfields.length > 0);

    if (normalFields.length === 0) {
      return null;
    }

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
      normal_fields: normalFields,
    };
  }
}
