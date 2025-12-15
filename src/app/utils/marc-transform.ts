import {
  ExistingMarcRecord,
  ExistingMarcRecordNormalField,
  ExistingMarcRecordSpecialField,
  ExtractedMarcNormalField,
  ExtractedMarcRecord,
  ExtractedMarcSpecialField,
  MarcCandidate,
  UiFieldWithMeta,
} from '../models/book';

export interface ExistingMarcRecordFieldMeta {
  fieldId: string;
  selectedCandidateId: string | null;
  candidates: MarcCandidate[];
  score: number;
}

export interface ExistingMarcRecordNormalFieldWithMeta
  extends ExistingMarcRecordNormalField,
    ExistingMarcRecordFieldMeta {}

export interface ExistingMarcRecordSpecialFieldWithMeta
  extends ExistingMarcRecordSpecialField,
    ExistingMarcRecordFieldMeta {}

export interface ExistingMarcRecordWithMeta extends ExistingMarcRecord {
  special_fields: ExistingMarcRecordSpecialFieldWithMeta[];
  normal_fields: ExistingMarcRecordNormalFieldWithMeta[];
}

function pickCandidate(f: ExtractedMarcNormalField) {
  const cand = f.candidates.find((c) => c.id === f.selected_candidate_id);
  if (!cand) {
    console.warn(
      `Missing candidate ${f.selected_candidate_id} in field ${f.id}`,
    );
  }
  return cand!;
}

const SPECIAL_TAGS = new Set(['001', '003', '005', '006', '007', '008']);
function isControlTag(tag: string): boolean {
  return SPECIAL_TAGS.has(tag);
}

export function extractedToExisting(
  extracted: ExtractedMarcRecord | null,
): ExistingMarcRecord | null {
  if (!extracted) return null;

  const special: ExistingMarcRecordSpecialField[] = [];
  const normal: ExistingMarcRecordNormalField[] = [];

  for (const [tag, fields] of Object.entries(extracted)) {
    if (!Array.isArray(fields) || fields.length === 0) continue;

    for (const f of fields) {
      if (isControlTag(tag)) {
        const field = f as ExtractedMarcSpecialField;
        const value = field.value;
        special.push({ tag, value });
      } else {
        const field = f as ExtractedMarcNormalField;
        if (!field.candidates.length) continue;

        const cand = pickCandidate(field);
        const rep = cand.MARC_representation;

        normal.push({
          tag,
          ind1: rep.ind1 ?? '',
          ind2: rep.ind2 ?? '',
          subfields: rep.subfields,
        });
      }
    }
  }

  special.sort((a, b) => a.tag.localeCompare(b.tag));
  normal.sort((a, b) => a.tag.localeCompare(b.tag));

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
    special_fields: special,
    normal_fields: normal,
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
        const field = f as ExtractedMarcSpecialField;

        out.push({
          fieldId: `special-${crypto.randomUUID()}`,
          tag,
          ind1: null,
          ind2: null,
          subfields: [],
          isManual: false,
          special: true,
          value: field.value,
        });
      } else {
        const field = f as ExtractedMarcNormalField;
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
          special: false,
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

  const special: ExistingMarcRecordSpecialFieldWithMeta[] = [];
  const normal: ExistingMarcRecordNormalFieldWithMeta[] = [];

  for (const [tag, fields] of Object.entries(extracted)) {
    if (!Array.isArray(fields) || fields.length === 0) continue;

    for (const f of fields) {
      if (isControlTag(tag)) {
        const field = f as ExtractedMarcSpecialField;
        const meta: ExistingMarcRecordFieldMeta = {
          fieldId: '',
          selectedCandidateId: '',
          candidates: [],
          score: 0,
        };

        special.push({
          tag,
          value: field.value,
          ...meta,
        });
      } else {
        const field = f as ExtractedMarcNormalField;
        if (!field.candidates.length) continue;
        const cand = pickCandidate(field);
        const rep = cand.MARC_representation;

        const meta: ExistingMarcRecordFieldMeta = {
          fieldId: field.id,
          selectedCandidateId: field.selected_candidate_id,
          candidates: field.candidates,
          score: cand.score,
        };

        normal.push({
          tag,
          ind1: rep.ind1 ?? '',
          ind2: rep.ind2 ?? '',
          subfields: rep.subfields,
          ...meta,
        });
      }
    }
  }

  special.sort((a, b) => a.tag.localeCompare(b.tag));
  normal.sort((a, b) => a.tag.localeCompare(b.tag));

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
    special_fields: special,
    normal_fields: normal,
  };

  return existing;
}
