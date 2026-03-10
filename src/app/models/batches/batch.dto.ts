import { BookStatusResponseDto } from '../books/book.dto';
import { ID } from '../shared/id.model';
import { BatchState, ProcessState } from '../shared/states.model';

export type BatchDto = {
  batch_id: ID;
  name: string;
  description: string | null;
  state: BatchState;
  num_books: number;
  created_by: string;
  created_at: string;
  modified_at: string;
};

export type PaginatedBatchesResponseDto = {
  batches: BatchDto[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
};

export interface BatchBooksResponseDto {
  batch_id: ID;
  books: BookStatusResponseDto[];
  total_count: number;
  state_counts: Record<ProcessState, number>;
}

export type UpdateBatchRequest = {
  name: string;
  description: string | null;
  state: BatchState;
};
