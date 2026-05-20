import { UUID } from '../shared/id.model';
import {
  ExistingMarcRecord,
  ExistingMarcRecordControlField,
  ExistingMarcRecordDataField,
  MarcCandidate,
} from './marc.dto';

export interface ExistingMarcRecordFieldMeta {
  fieldId: UUID;
  selectedCandidateId: UUID | null;
  candidates: MarcCandidate[];
  score: number;
}

export interface ExistingMarcRecordDataFieldWithMeta
  extends ExistingMarcRecordDataField,
    ExistingMarcRecordFieldMeta {}

export interface ExistingMarcRecordControlFieldWithMeta
  extends ExistingMarcRecordControlField,
    ExistingMarcRecordFieldMeta {}

export interface ExistingMarcRecordWithMeta extends ExistingMarcRecord {
  control_fields: ExistingMarcRecordControlFieldWithMeta[];
  data_fields: ExistingMarcRecordDataFieldWithMeta[];
}
