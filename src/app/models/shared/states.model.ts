export type ProcessState =
  | 'created'
  | 'scheduled'
  | 'in_progress'
  | 'ready'
  | 'failed'
  | 'completed';

export type BatchState = 'created' | 'in_progress' | 'completed';
export type RecordState = 'new' | 'edited' | 'reviewed' | 'completed';

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
