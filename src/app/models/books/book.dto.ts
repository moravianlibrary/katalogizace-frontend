import { UUID } from '../shared/id.model';
import { ProcessState, RecordState } from '../shared/states.model';
import { ApiImageItem } from './images.model';
import {
  ExistingMarcRecord,
  ExtractedMarcRecord,
  LastEditedRecord,
} from './marc.dto';
import { Step } from './provenance.dto';

export interface BookCommonDto {
  book_id: UUID;
  created_at: string | null;
  modified_at: string | null;
  process_state: ProcessState;
  record_state: RecordState;
  images: ApiImageItem[];
  hatchet_workflow_id: string | null;
  batch_id: string | null;
  error_message: string | null;
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
  library_sigla: string | null;
  existing_MARC_records: ExistingMarcRecord[];
  last_edited_record: LastEditedRecord | null;
  provenance: Record<UUID, Step[]>;
}

export interface BookUploadResponseDto {
  book_id: UUID;
  state: ProcessState; // pozor: v OpenAPI je to `process_state` – drž sa API a zjednoť názov ak treba
  hatchet_workflow_id: string | null;
  batch_id: string | null;
  images: ApiImageItem[];
  created_at: string;
}

export interface BookImageUploadResponseDto {
  book_id: UUID;
  image_id: UUID;
}
