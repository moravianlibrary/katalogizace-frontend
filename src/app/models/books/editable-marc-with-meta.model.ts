import { UUID } from '../shared/id.model';
import {
  ExistingMarcRecord,
  ExistingMarcRecordControlField,
  ExistingMarcRecordDataField,
} from './marc.dto';

export interface EditableMarcRecordFieldMeta {
  fieldId: UUID;
}

export interface EditableMarcRecordDataField
  extends ExistingMarcRecordDataField,
    EditableMarcRecordFieldMeta {}

export interface EditableMarcRecordControlField
  extends ExistingMarcRecordControlField,
    EditableMarcRecordFieldMeta {}

export interface EditableMarcRecord extends ExistingMarcRecord {
  control_fields: EditableMarcRecordControlField[];
  data_fields: EditableMarcRecordDataField[];
}
