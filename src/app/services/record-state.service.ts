import {
  EditableMarcRecord,
  ExistingMarcRecord,
  ExtractedMarcRecord,
  FieldType,
  ID,
  LastEditedRecord,
  MarcCandidate,
  MarcSubfield,
  RecordViewMode,
  UiFieldWithMeta,
  UUID,
} from '@/app/models';
import { computed, Injectable, signal } from '@angular/core';
import { QUICK_ADD } from '../models/shared/record-state';
import {
  existingToEditableWithMeta,
  extractedToEditableWithMeta,
} from '../utils/marc-transform';
import { EditSnapshot } from './context-panel.service';

@Injectable({ providedIn: 'root' })
export class RecordStateService {
  readonly viewMode = signal<RecordViewMode>('table');
  readonly focusTagFieldId = signal<UUID | null>(null);

  readonly editableRecord = signal<EditableMarcRecord | null>(null);
  readonly selectedFieldId = signal<UUID | null>(null);

  readonly uiFields = computed<UiFieldWithMeta[]>(() => {
    const rec = this.editableRecord();
    if (!rec) return [];

    const control = rec.control_fields.map((cf) => ({
      fieldId: cf.fieldId,
      tag: cf.tag,
      ind1: null,
      ind2: null,
      subfields: [],
      isManual: true,
      control: true,
      value: cf.value,
    }));

    const data = rec.data_fields.map((df) => ({
      fieldId: df.fieldId,
      tag: df.tag,
      ind1: df.ind1 ?? '',
      ind2: df.ind2 ?? '',
      subfields: (df.subfields ?? []).map((sf) => ({
        code: sf.code,
        value: sf.value,
        isManual: true,
      })),
      isManual: true,
      control: false,
      value: '',
    }));

    const all = [...control, ...data];
    all.sort((a, b) => a.tag.localeCompare(b.tag));
    return all;
  });

  readonly selectedField = computed(() => {
    const rec = this.editableRecord();
    const id = this.selectedFieldId();
    if (!rec || !id) return null;

    return (
      rec.control_fields.find((f) => f.fieldId === id) ??
      rec.data_fields.find((f) => f.fieldId === id) ??
      null
    );
  });

  readonly QUICK_ADD = QUICK_ADD;

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

  setEditableRecord(rec: EditableMarcRecord | null) {
    this.clearFocusTag();
    this.selectedFieldId.set(null);
    this.editableRecord.set(rec);
  }

  selectField(fieldId: UUID) {
    this.selectedFieldId.set(fieldId);
  }

  private insertSortedByTag<T extends { tag: string }>(arr: T[], item: T): T[] {
    const next = [...arr];

    const idx = next.findIndex(
      (f) => (f.tag ?? '').localeCompare(item.tag ?? '') > 0,
    );

    if (idx === -1) {
      next.push(item);
    } else {
      next.splice(idx, 0, item);
    }

    return next;
  }

  // TODO rovno predvyplnit polia
  addFieldWithTag(
    tag: number,
    fieldType: FieldType,
    subfields: MarcSubfield[],
    ind1: string,
    ind2: string,
  ) {
    const rec = this.editableRecord();
    if (!rec) return;

    const fieldId = `manual-${crypto.randomUUID()}` as UUID;

    if (fieldType === 'control') {
      const newField = {
        fieldId,
        tag: String(tag).padStart(3, '0'),
        value: '',
      };
      this.editableRecord.set({
        ...rec,
        control_fields: this.insertSortedByTag(rec.control_fields, newField),
      });
    } else {
      const newField = {
        fieldId,
        tag: String(tag).padStart(3, '0'),
        ind1: ind1,
        ind2: ind2,
        subfields: subfields,
      };

      this.editableRecord.set({
        ...rec,
        data_fields: this.insertSortedByTag(rec.data_fields, newField),
      });
    }

    this.selectField(fieldId);
    this.requestFocusTag(fieldId);
    this.editableRecord();
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

  applyCandidateToField(evt: { fieldId: UUID; candidate: MarcCandidate }) {
    const rec = this.editableRecord();
    if (!rec) return;

    const idx = rec.data_fields.findIndex((f) => f.fieldId === evt.fieldId);
    if (idx < 0) return;

    const cand = evt.candidate;
    const rep = cand.MARC_representation;

    const nextFields = [...rec.data_fields];
    nextFields[idx] = {
      ...nextFields[idx],
      ind1: rep.ind1 ?? '',
      ind2: rep.ind2 ?? '',
      subfields: rep.subfields ?? [],
    };

    this.editableRecord.set({ ...rec, data_fields: nextFields });
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
      this.setEditableRecord(null);
      return;
    }

    const editable = existingToEditableWithMeta(rec);
    this.setEditableRecord(editable);
  }

  loadFromExtracted(extracted: ExtractedMarcRecord | null) {
    this.clearFocusTag();

    if (!extracted) {
      this.setEditableRecord(null);
      return;
    }

    const editable = extractedToEditableWithMeta(extracted);
    this.setEditableRecord(editable);
  }

  addField(fieldType: FieldType) {
    const rec = this.editableRecord();
    if (!rec) return;

    const isControl = fieldType === 'control';
    const fieldId = `manual-${crypto.randomUUID()}` as UUID;

    if (isControl) {
      const newField = {
        fieldId,
        tag: '',
        value: '',
      };

      this.editableRecord.set({
        ...rec,
        control_fields: [newField, ...rec.control_fields],
      });
    } else {
      const newField = {
        fieldId,
        tag: '',
        ind1: '',
        ind2: '',
        subfields: [
          {
            code: '',
            value: '',
          },
        ],
      };

      this.editableRecord.set({
        ...rec,
        data_fields: [newField, ...rec.data_fields],
      });
    }

    this.requestFocusTag(fieldId);
  }

  removeField(fieldId: UUID) {
    const rec = this.editableRecord();
    if (!rec) return;

    this.editableRecord.set({
      ...rec,
      control_fields: rec.control_fields.filter((f) => f.fieldId !== fieldId),
      data_fields: rec.data_fields.filter((f) => f.fieldId !== fieldId),
    });

    if (this.selectedFieldId() === fieldId) this.selectedFieldId.set(null);
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
    const rec = this.editableRecord();
    console.log();
    if (!rec) return null;

    const control_fields = rec.control_fields
      .filter((f) => f.tag.trim().length === 3)
      .map((f) => ({ tag: f.tag.trim(), value: (f.value ?? '').trim() }))
      .filter((sf) => sf.value.length > 0);

    const data_fields = rec.data_fields
      .filter((f) => (f.tag ?? '').trim().length === 3)
      .map((f) => {
        const cleanedSubfields = f.subfields
          .map((sf) => ({
            code: (sf.code ?? '').trim(),
            value: (sf.value ?? '').trim(),
          }))
          .filter((sf) => sf.code.length === 1 && sf.value.length > 0);

        return {
          tag: f.tag.trim(),
          ind1: f.ind1.trim() ?? '',
          ind2: f.ind2.trim() ?? '',
          subfields: cleanedSubfields,
        };
      })
      .filter((df) => df.subfields.length > 0);

    return {
      record_id: 'preview',
      leader: rec.leader ?? '',
      source: 'user_edit',
      quality_assessment: rec.quality_assessment ?? {
        required_present: 0,
        required_total: 0,
        required_if_applicable_present: 0,
        required_if_applicable_total: 0,
      },
      control_fields,
      data_fields,
    };
  });

  patchDataField(
    fieldId: UUID,
    patch: Partial<EditableMarcRecord['data_fields'][number]>,
  ) {
    const rec = this.editableRecord();
    if (!rec) return;

    const idx = rec.data_fields.findIndex((f) => f.fieldId === fieldId);
    if (idx < 0) return;

    const nextFields = [...rec.data_fields];
    nextFields[idx] = { ...nextFields[idx], ...patch };

    this.editableRecord.set({ ...rec, data_fields: nextFields });
  }

  patchControlField(
    fieldId: UUID,
    patch: Partial<EditableMarcRecord['control_fields'][number]>,
  ) {
    const rec = this.editableRecord();
    if (!rec) return;

    const idx = rec.control_fields.findIndex((f) => f.fieldId === fieldId);
    if (idx < 0) return;

    const nextFields = [...rec.control_fields];
    nextFields[idx] = { ...nextFields[idx], ...patch };

    this.editableRecord.set({ ...rec, control_fields: nextFields });
  }

  clearSelection() {
    this.selectedFieldId.set(null);
  }

  patchSubfield(
    fieldId: UUID,
    subfieldIndex: number,
    patch: Partial<MarcSubfield>,
  ) {
    const rec = this.editableRecord();
    if (!rec) return;

    const idx = rec.data_fields.findIndex((f) => f.fieldId === fieldId);
    if (idx < 0) return;

    const f = rec.data_fields[idx];
    const subfields = (f.subfields ?? []).map((sf, i) =>
      i === subfieldIndex ? { ...sf, ...patch } : sf,
    );

    const nextFields = [...rec.data_fields];
    nextFields[idx] = { ...f, subfields };

    this.editableRecord.set({ ...rec, data_fields: nextFields });
  }

  addSubfield(fieldId: UUID, sf: MarcSubfield = { code: '', value: '' }) {
    const rec = this.editableRecord();
    if (!rec) return;

    const idx = rec.data_fields.findIndex((f) => f.fieldId === fieldId);
    if (idx < 0) return;

    const f = rec.data_fields[idx];
    const subfields = [...(f.subfields ?? []), sf];

    const nextFields = [...rec.data_fields];
    nextFields[idx] = { ...f, subfields };

    this.editableRecord.set({ ...rec, data_fields: nextFields });
  }

  removeSubfield(fieldId: UUID, subfieldIndex: number) {
    const rec = this.editableRecord();
    if (!rec) return;

    const idx = rec.data_fields.findIndex((f) => f.fieldId === fieldId);
    if (idx < 0) return;

    const f = rec.data_fields[idx];
    const subfields = (f.subfields ?? []).filter((_, i) => i !== subfieldIndex);

    const nextFields = [...rec.data_fields];
    nextFields[idx] = { ...f, subfields };

    this.editableRecord.set({ ...rec, data_fields: nextFields });
  }

  applyEditSnapshot(snap: EditSnapshot) {
    const rec = this.editableRecord();
    if (!rec) return;

    if (snap.kind === 'control') {
      const idx = rec.control_fields.findIndex(
        (f) => f.fieldId === snap.fieldId,
      );
      if (idx < 0) return;

      const next = [...rec.control_fields];
      next[idx] = { ...next[idx], value: snap.value };

      this.editableRecord.set({ ...rec, control_fields: next });
      return;
    }

    const idx = rec.data_fields.findIndex((f) => f.fieldId === snap.fieldId);
    if (idx < 0) return;

    const next = [...rec.data_fields];
    next[idx] = {
      ...next[idx],
      ind1: snap.ind1,
      ind2: snap.ind2,
      subfields: snap.subfields,
    };

    this.editableRecord.set({ ...rec, data_fields: next });
  }

  applyCandidateToEditableField(fieldId: UUID, candidate: MarcCandidate) {
    const rec = this.editableRecord();
    if (!rec) return;

    const idx = (rec.data_fields ?? []).findIndex(
      (f: any) => f.fieldId === fieldId,
    );
    if (idx < 0) return;

    const rep = candidate.MARC_representation;

    const updatedField = {
      ind1: rep.ind1 ?? '',
      ind2: rep.ind2 ?? '',
      subfields: rep.subfields ?? [],
      fieldId: rec.data_fields[idx].fieldId,
      tag: rec.data_fields[idx].tag,
    };

    const nextDataFields = [...rec.data_fields];
    nextDataFields[idx] = updatedField;

    this.editableRecord.set({
      ...rec,
      data_fields: nextDataFields,
    });
  }
}
