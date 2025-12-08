import {
  ExistingMarcRecord,
  ExistingMarcRecordNormalField,
  ExistingMarcRecordSpecialField,
  ExtractedMarcField,
  ExtractedMarcRecord,
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

function pickCandidate(f: ExtractedMarcField) {
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
      if (!f?.candidates?.length) continue;
      const cand = pickCandidate(f);
      const rep = cand.marc_representation;

      if (isControlTag(tag)) {
        const value =
          (rep.subfields && rep.subfields.length
            ? rep.subfields.map((sf) => sf.value).join(' ')
            : '') || '';
        special.push({ tag, value });
      } else {
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
  includeControl: boolean,
): UiFieldWithMeta[] {
  if (!extracted) return [];

  const out: UiFieldWithMeta[] = [];

  for (const [tag, fields] of Object.entries(extracted)) {
    if (!Array.isArray(fields) || fields.length === 0) continue;

    const isControl = isControlTag(tag);
    if (isControl && !includeControl) continue;

    for (const f of fields) {
      if (!f?.candidates?.length) continue;
      const cand = pickCandidate(f);
      const rep = cand.marc_representation;

      if (isControl) {
        const value =
          (rep.subfields && rep.subfields.length
            ? rep.subfields.map((sf) => sf.value).join(' ')
            : '') || '';

        out.push({
          tag,
          ind1: null,
          ind2: null,
          subfields: [{ code: '', value }],
          candidateId: cand.id,
          score: cand.score,
          candidates: f.candidates,
          extractedFieldId: f.id,
          isManual: false,
        });
      } else {
        out.push({
          tag,
          ind1: rep.ind1 ?? null,
          ind2: rep.ind2 ?? null,
          subfields: (rep.subfields ?? []).map((sf) => ({
            code: sf.code,
            value: sf.value,
          })),
          candidateId: cand.id,
          score: cand.score,
          candidates: f.candidates,
          extractedFieldId: f.id,
          isManual: false,
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
      if (!f?.candidates?.length) continue;

      const cand = pickCandidate(f);
      const rep = cand.marc_representation;

      const meta: ExistingMarcRecordFieldMeta = {
        fieldId: f.id,
        selectedCandidateId: f.selected_candidate_id,
        candidates: f.candidates,
        score: cand.score,
      };

      if (isControlTag(tag)) {
        const value =
          (rep.subfields && rep.subfields.length
            ? rep.subfields.map((sf) => sf.value).join(' ')
            : '') || '';

        special.push({
          tag,
          value,
          ...meta,
        });
      } else {
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
