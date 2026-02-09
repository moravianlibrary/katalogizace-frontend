import {
  ExistingMarcRecord,
  ExtractedMarcRecord,
  FieldType,
  ID,
  LastEditedRecord,
  MarcCandidate,
  RecordViewMode,
  UiFieldWithMeta,
  UUID,
} from '@/app/models';
import { computed, Injectable, signal } from '@angular/core';
import { extractedToUiFields } from '../utils/marc-transform';

@Injectable({ providedIn: 'root' })
export class RecordStateService {
  readonly uiFields = signal<UiFieldWithMeta[]>([]);

  readonly viewMode = signal<RecordViewMode>('cards');

  readonly focusTagFieldId = signal<UUID | null>(null);

  requestFocusTag(fieldId: UUID) {
    this.focusTagFieldId.set(fieldId);
  }

  clearFocusTag() {
    this.focusTagFieldId.set(null);
  }

  SPECIAL_TAGS = new Set(['001', '003', '005', '006', '007', '008']);
  isControlTag(tag: string): boolean {
    return this.SPECIAL_TAGS.has(tag);
  }

  touch() {
    const current = this.uiFields();
    this.uiFields.set([...current]);
  }

  applyCandidateToUiField(evt: { fieldId: UUID; candidate: MarcCandidate }) {
    const current = this.uiFields();
    const idx = current.findIndex((f) => f.fieldId === evt.fieldId);
    if (idx < 0) return;

    const cand = evt.candidate;
    const rep = cand.MARC_representation;

    const updated = {
      ...current[idx],
      ind1: rep.ind1 ?? '',
      ind2: rep.ind2 ?? '',
      subfields: (rep.subfields ?? []).map((sf: any) => ({
        code: sf.code,
        value: sf.value,
        isManual: true,
      })),
      selectedCandidateId: cand.id,
      score: cand.score,
    };

    const next = [...current];
    next[idx] = updated;

    this.uiFields.set(next);
  }

  toggleViewMode() {
    this.clearFocusTag();

    this.viewMode.update((m) => (m === 'cards' ? 'table' : 'cards'));
  }

  resetViewMode() {
    this.viewMode.set('cards');
  }

  loadFromExistingOrLastEdited(
    rec: ExistingMarcRecord | LastEditedRecord | null,
  ) {
    this.clearFocusTag();

    if (!rec) {
      this.uiFields.set([]);
      return;
    }

    const special: UiFieldWithMeta[] = rec.special_fields.map((sf) => ({
      fieldId: `${crypto.randomUUID()}`,
      tag: sf.tag,
      ind1: '',
      ind2: '',
      subfields: [],
      isManual: true,
      special: true,
      value: sf.value,
    }));

    const normal: UiFieldWithMeta[] = rec.normal_fields.map((nf) => ({
      fieldId: `${crypto.randomUUID()}`,
      tag: nf.tag,
      ind1: nf.ind1 ?? '',
      ind2: nf.ind2 ?? '',
      subfields:
        nf.subfields?.map((sf) => ({
          code: sf.code,
          value: sf.value,
          isManual: true,
        })) ?? [],
      isManual: true,
      special: false,
      value: '',
    }));

    special.sort((a, b) => a.tag.localeCompare(b.tag));
    normal.sort((a, b) => a.tag.localeCompare(b.tag));

    this.uiFields.set(special.concat(normal));
  }

  loadFromExtracted(extracted: ExtractedMarcRecord | null) {
    this.clearFocusTag();

    if (!extracted) {
      this.uiFields.set([]);
      return;
    }

    const fields = extractedToUiFields(extracted);
    this.uiFields.set(fields);
  }

  addField(fieldType: FieldType) {
    const current = this.uiFields();
    const isSpecial = fieldType === 'special';

    const newField: UiFieldWithMeta = {
      fieldId: `manual-${crypto.randomUUID()}`,
      tag: '',
      ind1: '',
      ind2: '',
      subfields: isSpecial
        ? []
        : [
            {
              code: '',
              value: '',
              isManual: true,
            },
          ],
      isManual: true,
      special: isSpecial,
      value: '',
    };

    this.uiFields.set([newField, ...current]);

    this.requestFocusTag(newField.fieldId);
  }

  removeField(fieldId: UUID) {
    const current = this.uiFields();
    this.uiFields.set(current.filter((f) => f.fieldId !== fieldId));
  }

  buildExistingRecord(bookId: ID): LastEditedRecord | null {
    const preview = this.recordPreview();

    if (!preview) {
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
        normal_fields: [],
      };
    }

    return {
      ...preview,
      record_id: `frontend-${bookId}`,
      source: 'user_edit',
    };
  }

  readonly recordPreview = computed<ExistingMarcRecord | null>(() => {
    const fields = this.uiFields().filter((f) => f.tag.trim().length === 3);

    const special_fields = fields
      .filter((f) => f.special && f.tag.trim().length === 3)
      .map((f) => ({
        tag: f.tag.trim(),
        value: (f.value ?? '').trim(),
      }))
      .filter((sf) => sf.value.length > 0);

    const normal_fields = fields
      .filter((f) => !f.special)
      .map((f) => {
        const cleanedSubfields =
          f.subfields
            ?.map((sf) => ({
              code: (sf.code ?? '').trim(),
              value: (sf.value ?? '').trim(),
            }))
            .filter((sf) => sf.code.length === 1 && sf.value.length > 0) ?? [];

        return {
          tag: f.tag.trim(),
          ind1: f.ind1?.trim() ?? '',
          ind2: f.ind2?.trim() ?? '',
          subfields: cleanedSubfields,
        };
      })
      .filter((nf) => nf.subfields.length > 0);

    return {
      record_id: 'preview',
      leader: '',
      source: 'user_edit',
      quality_assessment: {
        required_present: 0,
        required_total: 0,
        required_if_applicable_present: 0,
        required_if_applicable_total: 0,
      },
      special_fields,
      normal_fields,
    };
  });
}
