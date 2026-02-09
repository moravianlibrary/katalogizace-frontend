import { MarcTag, UUID } from '../shared/id.model';

export type ExtractedMarcRecord = Record<
  MarcTag,
  ExtractedMarcSpecialField[] | ExtractedMarcNormalField[]
>;

export interface ExtractedMarcSpecialField {
  value: string;
}

export interface ExtractedMarcNormalField {
  id: UUID;
  candidates: MarcCandidate[];
  selected_candidate_id: UUID | null;
}

export interface MarcCandidate {
  id: UUID;
  score: number;
  MARC_representation: CandidateMarcRepresentation;
}

export interface CandidateMarcRepresentation {
  ind1: string | null;
  ind2: string | null;
  subfields: MarcSubfield[];
}

export interface MarcSubfield {
  code: string;
  value: string;
}

export interface ExistingMarcRecord {
  record_id: UUID;
  leader: string;
  source: string;
  quality_assessment: QualityScore | null;
  special_fields: ExistingMarcRecordSpecialField[];
  normal_fields: ExistingMarcRecordNormalField[];
}

export interface LastEditedRecord extends ExistingMarcRecord {}

export interface QualityScore {
  required_present: number;
  required_total: number;
  required_if_applicable_present: number;
  required_if_applicable_total: number;
}

export interface ExistingMarcRecordSpecialField {
  tag: string;
  value: string;
}

export interface ExistingMarcRecordNormalField {
  tag: string;
  ind1: string;
  ind2: string;
  subfields: MarcSubfield[];
}
