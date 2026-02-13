import { FieldType } from '../books/record-view.model';

export interface QuickAddItem {
  tag: number;
  repeatable: boolean;
  type: FieldType;
}
