import {
  EditableMarcRecord,
  EditableMarcRecordControlField,
  EditableMarcRecordDataField,
  ExistingMarcRecord,
  ExistingMarcRecordControlField,
  ExistingMarcRecordControlFieldWithMeta,
  ExistingMarcRecordDataField,
  ExistingMarcRecordDataFieldWithMeta,
  ExistingMarcRecordFieldMeta,
  ExistingMarcRecordWithMeta,
  ExtractedMarcControlField,
  ExtractedMarcDataField,
  ExtractedMarcRecord,
  LastEditedRecord,
  UiFieldWithMeta,
} from '@/app/models';

function pickCandidate(f: ExtractedMarcDataField) {
  const cand = f.candidates.find((c) => c.id === f.selected_candidate_id);
  if (!cand) {
    console.warn(
      `Missing candidate ${f.selected_candidate_id} in field ${f.id}`,
    );
  }
  return cand!;
}

const CONTROL_TAGS = new Set(['001', '003', '005', '006', '007', '008']);
function isControlTag(tag: string): boolean {
  return CONTROL_TAGS.has(tag);
}

export function extractedToExisting(
  extracted: ExtractedMarcRecord | null,
): ExistingMarcRecord | null {
  if (!extracted) return null;

  const control: ExistingMarcRecordControlField[] = [];
  const data: ExistingMarcRecordDataField[] = [];

  for (const [tag, fields] of Object.entries(extracted)) {
    if (!Array.isArray(fields) || fields.length === 0) continue;

    for (const f of fields) {
      if (isControlTag(tag)) {
        const field = f as ExtractedMarcControlField;
        const value = field.value;
        control.push({ tag, value });
      } else {
        const field = f as ExtractedMarcDataField;
        if (!field.candidates.length) continue;

        const cand = pickCandidate(field);
        const rep = cand.MARC_representation;

        data.push({
          tag,
          ind1: rep.ind1 ?? '',
          ind2: rep.ind2 ?? '',
          subfields: rep.subfields,
        });
      }
    }
  }

  control.sort((a, b) => a.tag.localeCompare(b.tag));
  data.sort((a, b) => a.tag.localeCompare(b.tag));

  const existing: ExistingMarcRecord = {
    record_id: 'extracted-synthetic',
    leader: '',
    source: '',
    quality_assessment: {
      required_present: 0,
      required_total: 0,
      required_if_applicable_present: 0,
      required_if_applicable_total: 0,
    },
    control_fields: control,
    data_fields: data,
  };

  return existing;
}

export function extractedToUiFields(
  extracted: ExtractedMarcRecord | null,
): UiFieldWithMeta[] {
  if (!extracted) return [];

  const out: UiFieldWithMeta[] = [];

  for (const [tag, fields] of Object.entries(extracted)) {
    if (!Array.isArray(fields) || fields.length === 0) continue;

    for (const f of fields) {
      if (isControlTag(tag)) {
        const field = f as ExtractedMarcControlField;

        out.push({
          fieldId: `control-${crypto.randomUUID()}`,
          tag,
          ind1: null,
          ind2: null,
          subfields: [],
          isManual: false,
          control: true,
          value: field.value,
        });
      } else {
        const field = f as ExtractedMarcDataField;
        if (!field.candidates.length) continue;
        const cand = pickCandidate(field);
        const rep = cand.MARC_representation;

        out.push({
          fieldId: field.id,
          tag,
          ind1: rep.ind1 ?? null,
          ind2: rep.ind2 ?? null,
          subfields: (rep.subfields ?? []).map((sf) => ({
            code: sf.code,
            value: sf.value,
          })),
          isManual: false,
          control: false,
          value: '',
        });
      }
    }
  }

  out.sort((a, b) => a.tag.localeCompare(b.tag));
  return out;
}

export function extractedToExistingWithMeta(
  extracted: ExtractedMarcRecord | null,
): ExistingMarcRecordWithMeta | null {
  if (!extracted) return null;

  const control: ExistingMarcRecordControlFieldWithMeta[] = [];
  const data: ExistingMarcRecordDataFieldWithMeta[] = [];

  for (const [tag, fields] of Object.entries(extracted)) {
    if (!Array.isArray(fields) || fields.length === 0) continue;

    for (const f of fields) {
      if (isControlTag(tag)) {
        const field = f as ExtractedMarcControlField;
        const meta: ExistingMarcRecordFieldMeta = {
          fieldId: '',
          selectedCandidateId: '',
          candidates: [],
          score: 0,
        };

        control.push({
          tag,
          value: field.value,
          ...meta,
        });
      } else {
        const field = f as ExtractedMarcDataField;
        if (!field.candidates.length) continue;
        const cand = pickCandidate(field);
        const rep = cand.MARC_representation;

        const meta: ExistingMarcRecordFieldMeta = {
          fieldId: field.id,
          selectedCandidateId: field.selected_candidate_id,
          candidates: field.candidates,
          score: cand.score,
        };

        data.push({
          tag,
          ind1: rep.ind1 ?? '',
          ind2: rep.ind2 ?? '',
          subfields: rep.subfields,
          ...meta,
        });
      }
    }
  }

  control.sort((a, b) => a.tag.localeCompare(b.tag));
  data.sort((a, b) => a.tag.localeCompare(b.tag));

  const existing: ExistingMarcRecordWithMeta = {
    record_id: 'extracted-synthetic',
    leader: '',
    source: '',
    quality_assessment: {
      required_present: 0,
      required_total: 0,
      required_if_applicable_present: 0,
      required_if_applicable_total: 0,
    },
    control_fields: control,
    data_fields: data,
  };

  return existing;
}

export function extractedToEditableWithMeta(
  extracted: ExtractedMarcRecord | null,
): EditableMarcRecord | null {
  if (!extracted) return null;

  const control: EditableMarcRecordControlField[] = [];
  const data: EditableMarcRecordDataField[] = [];

  for (const [tag, fields] of Object.entries(extracted)) {
    if (!Array.isArray(fields) || fields.length === 0) continue;

    for (const f of fields) {
      if (isControlTag(tag)) {
        const field = f as ExtractedMarcControlField;

        control.push({
          tag,
          value: field.value,
          fieldId: `control-${crypto.randomUUID()}`,
        });
      } else {
        const field = f as ExtractedMarcDataField;

        if (!field.candidates.length) continue;

        const cand = pickCandidate(field);
        const rep = cand.MARC_representation;

        data.push({
          tag,
          ind1: rep.ind1 ?? '',
          ind2: rep.ind2 ?? '',
          subfields: rep.subfields,
          fieldId: field.id,
        });
      }
    }
  }

  control.sort((a, b) => a.tag.localeCompare(b.tag));
  data.sort((a, b) => a.tag.localeCompare(b.tag));

  const editable: EditableMarcRecord = {
    record_id: `editable-${crypto.randomUUID()}`,
    leader: '',
    source: '',
    quality_assessment: {
      required_present: 0,
      required_total: 0,
      required_if_applicable_present: 0,
      required_if_applicable_total: 0,
    },
    control_fields: control,
    data_fields: data,
  };

  return editable;
}

export function existingToEditableWithMeta(
  existing: ExistingMarcRecord | LastEditedRecord | null,
): EditableMarcRecord | null {
  if (!existing) return null;

  const control: EditableMarcRecordControlField[] = existing.control_fields.map(
    (cf: ExistingMarcRecordControlField) => ({
      tag: cf.tag,
      value: cf.value,
      fieldId: `control-${crypto.randomUUID()}`,
    }),
  );

  const data: EditableMarcRecordDataField[] = existing.data_fields.map(
    (df: any) => ({
      tag: df.tag,
      ind1: df.ind1 ?? '',
      ind2: df.ind2 ?? '',
      subfields: df.subfields ?? [],
      fieldId: `data-${crypto.randomUUID()}`,
    }),
  );

  control.sort((a, b) => a.tag.localeCompare(b.tag));
  data.sort((a, b) => a.tag.localeCompare(b.tag));

  const editable: EditableMarcRecord = {
    record_id: existing.record_id,
    leader: existing.leader,
    source: existing.source,
    quality_assessment: existing.quality_assessment,
    control_fields: control,
    data_fields: data,
  };

  return editable;
}
