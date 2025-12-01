export type UUID = string;

export type TaskState =
  | 'new'
  | 'scheduled'
  | 'in_progress'
  | 'ready'
  | 'failed'
  | 'completed';

export type MarcTag = `${number}${number}${number}` | string;

export interface ImgItem {
  id: string;
  url: string;
  loading: boolean;
  error: string | null;
  pageType: string;
}

export type PageType =
  | 'TitlePage'
  | 'TableOfContents'
  | 'FrontCover'
  | 'BackCover'
  | 'Impressum'
  | 'EndPage'
  | 'Unknown';
export interface ApiImageItem {
  image_id: UUID;
  page_type: PageType | null;
}

export interface BookCommon {
  book_id: UUID;
  created_at?: string;
  modified_at?: string;
  state?: TaskState;
  images: ApiImageItem[];
  hatchet_workflow_id?: string | null;
  batch_id?: string | null;
  error_message?: string | null;
}
export interface BookRecordInfo extends BookCommon {}

export interface PaginatedBooksResponse {
  books: BookRecordInfo[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface BookStatusResponse extends BookCommon {}

export type ExtractedMarcRecord = Record<MarcTag, ExtractedMarcField[]>;
export interface BookResultResponse extends BookCommon {
  extracted_marc_record?: Record<string, ExtractedMarcField[]> | null;
  library_sigla: string | null;
  existing_marc_records?: ExistingMarcRecord[];
  last_edited_record: LastEditedRecord | null;
  provenance?: Record<UUID, Step[]>;
}

export interface ExtractedMarcField {
  id: UUID;
  candidates: MarcCandidate[];
  selected_candidate_id: UUID | null;
}

export interface MarcCandidate {
  id: UUID;
  score: number;
  marc_representation: CandidateMarcRepresentation;
}

export interface CandidateMarcRepresentation {
  ind1: string | null;
  ind2: string | null;
  subfields?: MarcSubfield[];
}

export interface ExistingMarcRecord {
  record_id: string;
  leader: string;
  source: string;
  quality_assessment: QualityScore;
  special_fields?: ExistingMarcRecordSpecialField[];
  normal_fields?: ExistingMarcRecordNormalField[];
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
  subfields?: MarcSubfield[];
}

export interface MarcSubfield {
  code: string;
  value: string;
}

export interface BookUploadResponse {
  book_id: UUID;
  state: TaskState;
  hatchet_workflow_id?: string | null;
  batch_id?: string | null;
  images?: ApiImageItem[];
  created_at: string;
}

export type StepKind =
  | 'extraction'
  | 'assignment'
  | 'ocr'
  | 'disambiguation'
  | 'normalization'
  | 'authority_search'
  | 'authority_match'
  | 'dedup_search'
  | 'dedup_match'
  | 'transliteration'
  | 'human_edit';

export const STEP_KIND_LABELS: Record<StepKind, string> = {
  extraction: 'Extrakce',
  assignment: 'Přiřazení',
  ocr: 'OCR',
  disambiguation: 'Disambiguace',
  normalization: 'Normalizace',
  authority_search: 'Hledání autorit',
  authority_match: 'Spárování autorit',
  dedup_search: 'Hledání duplicit',
  dedup_match: 'Spárování duplicit',
  transliteration: 'Transliterace',
  human_edit: 'Ruční úprava',
};

export interface Step {
  kind: StepKind;
  description: string;
}

export interface CandidateProvenanceResponse {
  book_id: UUID;
  candidate_id: UUID;
  provenance?: Step[];
}

export interface BatchBooksResponse {
  batch_id: UUID;
  books: BookStatusResponse[];
  total_count: number;
  state_counts?: Record<TaskState, number>;
}

export type UiSubfield = { code: string; value: string; isManual?: boolean };

export type UiFieldWithMeta = {
  extractedFieldId: UUID;
  tag: string;
  ind1: string | null;
  ind2: string | null;
  subfields: UiSubfield[];
  candidateId: UUID;
  score: number;
  candidates: MarcCandidate[];
  isManual: boolean;
};
