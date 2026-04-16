import { ID, UUID } from '../shared/id.model';
import { ProcessState, RecordState } from '../shared/states.model';
import { ApiImageItem } from './images.model';
import {
  ExistingMarcRecord,
  ExtractedMarcRecord,
  LastEditedRecord,
} from './marc.dto';
import { Step } from './provenance.dto';

export interface BookCommonDto {
  book_id: ID;
  batch_id: ID | null;
  created_at: string | null;
  modified_at: string | null;
  title: string;
  author: string;
  year_of_publishing: number;
  process_state: ProcessState;
  record_state: RecordState;
  images: ApiImageItem[];
  hatchet_workflow_id: UUID | null;
  error_message: string | null;
  created_by: string;
}

export interface BookRecordInfoDto extends BookCommonDto {}
export interface BookStatusResponseDto extends BookCommonDto {}

export interface PaginatedBooksResponseDto {
  books: BookRecordInfoDto[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface BookResultResponseDto extends BookCommonDto {
  extracted_MARC_record: ExtractedMarcRecord | null;
  existing_MARC_records: ExistingMarcRecord[];
  last_edited_record: LastEditedRecord | null;
  provenance: Record<UUID, Step[]>;
  warnings: string[];
  batch_name: string;
}

export interface BookUploadResponseDto {
  book_id: ID;
  process_state: ProcessState;
  record_state: RecordState;
  hatchet_workflow_id: UUID | null;
  batch_id: ID;
  images: ApiImageItem[];
  created_at: string;
}

export interface BookImageUploadResponseDto {
  book_id: ID;
  image_id: ID;
}

export interface BookImageUrlResponse {
  url: string;
  expiration_seconds: number;
}
