export type TaskState =
  | 'new'
  | 'scheduled'
  | 'in_progress'
  | 'ready'
  | 'failed'
  | 'completed';

export interface BookRecordInfo {
  book_id: string;
  created_at?: string;
  modified_at?: string;
  state?: TaskState;
  // ... ďalšie polia v špecifikácii teraz nepotrebujeme
}

export interface PaginatedBooksResponse {
  books: BookRecordInfo[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}
