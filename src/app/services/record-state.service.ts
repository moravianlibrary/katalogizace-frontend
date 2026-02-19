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

  readonly viewMode = signal<RecordViewMode>('table');

  readonly focusTagFieldId = signal<UUID | null>(null);

  readonly QUICK_ADD = [
    { tag: 100, repeatable: false, type: 'data' as FieldType },
    { tag: 245, repeatable: false, type: 'data' as FieldType },
    { tag: 255, repeatable: true, type: 'data' as FieldType },
    { tag: 264, repeatable: true, type: 'data' as FieldType },
    { tag: 300, repeatable: true, type: 'data' as FieldType },
    { tag: 500, repeatable: true, type: 'data' as FieldType },
    { tag: 651, repeatable: true, type: 'data' as FieldType },
    { tag: 655, repeatable: true, type: 'data' as FieldType },
  ];

  readonly visibleQuickAdd = computed(() => {
    const existing = new Set<number>();

    for (const f of this.uiFields()) {
      const n = Number(f.tag);
      if (!Number.isNaN(n)) existing.add(n);
    }

    return this.QUICK_ADD.filter(
      (it) => it.repeatable || !existing.has(it.tag),
    );
  });

  // TODO rovno predvyplnit polia
  addFieldWithTag(tag: number, fieldType: FieldType) {
    const current = this.uiFields();
    const isControl = fieldType === 'control';

    const newField: UiFieldWithMeta = {
      fieldId: `manual-${crypto.randomUUID()}`,
      tag: String(tag).padStart(3, '0'),
      ind1: '',
      ind2: '',
      subfields: isControl ? [] : [{ code: '', value: '', isManual: true }],
      isManual: true,
      control: isControl,
      value: '',
    };

    this.uiFields.set([newField, ...current]);
    this.requestFocusTag(newField.fieldId);
  }

  requestFocusTag(fieldId: UUID) {
    this.focusTagFieldId.set(fieldId);
  }

  clearFocusTag() {
    this.focusTagFieldId.set(null);
  }

  CONTROL_TAGS = new Set(['001', '003', '005', '006', '007', '008']);
  isControlTag(tag: string): boolean {
    return this.CONTROL_TAGS.has(tag);
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

  setViewMode(mode: RecordViewMode) {
    this.clearFocusTag();
    this.viewMode.set(mode);
  }

  resetViewMode() {
    this.viewMode.set('table');
  }

  loadFromExistingOrLastEdited(
    rec: ExistingMarcRecord | LastEditedRecord | null,
  ) {
    this.clearFocusTag();

    if (!rec) {
      this.uiFields.set([]);
      return;
    }

    const control: UiFieldWithMeta[] = rec.control_fields.map((sf) => ({
      fieldId: `${crypto.randomUUID()}`,
      tag: sf.tag,
      ind1: '',
      ind2: '',
      subfields: [],
      isManual: true,
      control: true,
      value: sf.value,
    }));

    const data: UiFieldWithMeta[] = rec.data_fields.map((df) => ({
      fieldId: `${crypto.randomUUID()}`,
      tag: df.tag,
      ind1: df.ind1 ?? '',
      ind2: df.ind2 ?? '',
      subfields:
        df.subfields?.map((sf) => ({
          code: sf.code,
          value: sf.value,
          isManual: true,
        })) ?? [],
      isManual: true,
      control: false,
      value: '',
    }));

    control.sort((a, b) => a.tag.localeCompare(b.tag));
    data.sort((a, b) => a.tag.localeCompare(b.tag));

    this.uiFields.set(control.concat(data));
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
    const isControl = fieldType === 'control';

    const newField: UiFieldWithMeta = {
      fieldId: `manual-${crypto.randomUUID()}`,
      tag: '',
      ind1: '',
      ind2: '',
      subfields: isControl
        ? []
        : [
            {
              code: '',
              value: '',
              isManual: true,
            },
          ],
      isManual: true,
      control: isControl,
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
        control_fields: [],
        data_fields: [],
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

    const control_fields = fields.filter((f) => f.control);
    // .map((f) => ({
    //   tag: f.tag.trim(),
    //   value: (f.value ?? '').trim(),
    // }))
    // .filter((sf) => sf.value.length > 0);

    const data_fields = fields
      .filter((f) => !f.control)
      .map((f) => {
        const cleanedSubfields = f.subfields;
        // ?.map((sf) => ({
        //   code: (sf.code ?? '').trim(),
        //   value: (sf.value ?? '').trim(),
        // }))
        // .filter((sf) => sf.code.length === 1 && sf.value.length > 0) ?? [];

        return {
          tag: f.tag.trim(),
          ind1: f.ind1?.trim() ?? '',
          ind2: f.ind2?.trim() ?? '',
          subfields: cleanedSubfields,
        };
      })
      .filter((df) => df.subfields.length > 0);

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
      control_fields,
      data_fields,
    };
  });
}
