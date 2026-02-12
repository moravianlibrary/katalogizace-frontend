import { UUID } from '../shared/id.model';
import {
  ExistingMarcRecord,
  ExistingMarcRecordControlField,
  ExistingMarcRecordNormalField,
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

export interface ExistingMarcRecordControlFieldWithMeta
  extends ExistingMarcRecordControlField,
    ExistingMarcRecordFieldMeta {}

export interface ExistingMarcRecordWithMeta extends ExistingMarcRecord {
  control_fields: ExistingMarcRecordControlFieldWithMeta[];
  normal_fields: ExistingMarcRecordNormalFieldWithMeta[];
}
