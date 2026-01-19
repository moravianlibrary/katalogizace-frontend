import {
  BatchState,
  ProcessState,
  RecordState,
  StepKind,
} from './states.model';

export const PROCESS_STATE_LABELS: Record<ProcessState, string> = {
  created: 'Vytvořeno',
  scheduled: 'Naplánováno',
  in_progress: 'Probíhá zpracování',
  ready: 'Připraveno',
  failed: 'Chyba',
  completed: 'Dokončeno',
};

export const RECORD_STATE_LABELS: Record<RecordState, string> = {
  new: 'Nový záznam',
  edited: 'Upraveno',
  reviewed: 'Zkontrolováno',
  completed: 'Schváleno',
};

export const BATCH_STATE_LABELS: Record<BatchState, string> = {
  created: 'Vytvořeno',
  in_progress: 'Probíhá zpracování',
  completed: 'Dokončeno',
};

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
