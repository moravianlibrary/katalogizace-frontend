import { UUID } from '../shared/id.model';
import { ExistingMarcRecord, ExtractedMarcRecord } from './marc.dto';

export type UiSubfield = { code: string; value: string; isManual?: boolean };

export type UiFieldWithMeta = {
  fieldId: UUID;
  tag: string;
  ind1: string | null;
  ind2: string | null;
  subfields: UiSubfield[];
  isManual: boolean;
  control: boolean;
  value: string;
};

export interface MarcRecordsItem {
  extracted: ExtractedMarcRecord | null;
  existing: ExistingMarcRecord | null;
}
