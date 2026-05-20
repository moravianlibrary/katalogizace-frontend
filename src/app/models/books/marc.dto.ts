import { MarcTag, UUID } from '../shared/id.model';

export type ExtractedMarcRecord = Record<
  MarcTag,
  ExtractedMarcControlField[] | ExtractedMarcDataField[]
>;

export interface ExtractedMarcControlField {
  value: string;
}

export interface ExtractedMarcDataField {
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
  control_fields: ExistingMarcRecordControlField[];
  data_fields: ExistingMarcRecordDataField[];
}

export interface LastEditedRecord extends ExistingMarcRecord {}

export interface QualityScore {
  required_present: number;
  required_total: number;
  required_if_applicable_present: number;
  required_if_applicable_total: number;
}

export interface ExistingMarcRecordControlField {
  tag: string;
  value: string;
}

export interface ExistingMarcRecordDataField {
  tag: string;
  ind1: string;
  ind2: string;
  subfields: MarcSubfield[];
}
