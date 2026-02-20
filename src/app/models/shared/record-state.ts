import { MarcSubfield } from '../books/marc.dto';
import { FieldType } from '../books/record-view.model';

export interface QuickAddItem {
  tag: number;
  ind1: string;
  ind2: string;
  subfields: MarcSubfield[];
  repeatable: boolean;
  type: FieldType;
}
