import { MarcSubfield } from '../books/marc.dto';
import { FieldType } from '../books/record-view.model';

export interface QuickAddItem {
  tag: number;
  subfields: MarcSubfield[];
  repeatable: boolean;
  type: FieldType;
}
