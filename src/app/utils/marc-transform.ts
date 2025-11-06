import {
  ExistingMarcRecord,
  ExistingMarcRecordNormalField,
  ExistingMarcRecordSpecialField,
  ExtractedMarcField,
  ExtractedMarcRecord,
} from '../models/book';

function pickCandidate(f: ExtractedMarcField) {
  return f.candidates.find((c) => c.id === f.selected_candidate_id)!;
}

function compareTags(a: string, b: string): number {
  const na = Number(a),
    nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b);
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

  special.sort((a, b) => compareTags(a.tag, b.tag));
  normal.sort((a, b) => compareTags(a.tag, b.tag));

  const existing: ExistingMarcRecord = {
    record_id: 'extracted-synthetic',
    leader: '',
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
