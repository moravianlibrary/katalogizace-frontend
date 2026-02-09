import { UUID } from '../shared/id.model';
import {
  ExistingMarcRecord,
  ExistingMarcRecordNormalField,
  ExistingMarcRecordSpecialField,
  MarcCandidate,
} from './marc.dto';

export interface ExistingMarcRecordFieldMeta {
  fieldId: UUID;
  selectedCandidateId: UUID | null;
  candidates: MarcCandidate[];
  score: number;
}

export interface ExistingMarcRecordNormalFieldWithMeta
  extends ExistingMarcRecordNormalField,
    ExistingMarcRecordFieldMeta {}

export interface ExistingMarcRecordSpecialFieldWithMeta
  extends ExistingMarcRecordSpecialField,
    ExistingMarcRecordFieldMeta {}

export interface ExistingMarcRecordWithMeta extends ExistingMarcRecord {
  special_fields: ExistingMarcRecordSpecialFieldWithMeta[];
  normal_fields: ExistingMarcRecordNormalFieldWithMeta[];
}
