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

export const QUICK_ADD: QuickAddItem[] = [
  {
    tag: 100,
    ind1: '',
    ind2: '',
    subfields: [
      { code: 'a', value: '' },
      { code: 'd', value: '' },
      { code: '7', value: '' },
      { code: '4', value: '' },
    ],
    repeatable: false,
    type: 'data' as FieldType,
  },
  {
    tag: 245,
    ind1: '',
    ind2: '',
    subfields: [
      { code: 'a', value: '' },
      { code: 'b', value: '' },
      { code: 'c', value: '' },
    ],
    repeatable: false,
    type: 'data' as FieldType,
  },
  {
    tag: 255,
    ind1: '',
    ind2: '',
    subfields: [{ code: 'a', value: '' }],
    repeatable: true,
    type: 'data' as FieldType,
  },
  {
    tag: 264,
    ind1: '',
    ind2: '',
    subfields: [
      { code: 'b', value: '' },
      { code: 'c', value: '' },
    ],
    repeatable: true,
    type: 'data' as FieldType,
  },
  {
    tag: 300,
    ind1: '',
    ind2: '',
    subfields: [
      { code: 'a', value: '' },
      { code: 'b', value: '' },
    ],
    repeatable: true,
    type: 'data' as FieldType,
  },
  {
    tag: 500,
    ind1: '',
    ind2: '',
    subfields: [{ code: 'a', value: '' }],
    repeatable: true,
    type: 'data' as FieldType,
  },
  {
    tag: 650,
    ind1: '',
    ind2: '7',
    subfields: [
      { code: 'a', value: '' },
      { code: '2', value: 'czenas' },
      { code: '7', value: '' },
    ],
    repeatable: true,
    type: 'data' as FieldType,
  },
  {
    tag: 651,
    ind1: '',
    ind2: '7',
    subfields: [
      { code: 'a', value: '' },
      { code: '2', value: 'czenas' },
      { code: '7', value: '' },
    ],
    repeatable: true,
    type: 'data' as FieldType,
  },
  {
    tag: 655,
    ind1: '',
    ind2: '7',
    subfields: [
      { code: 'a', value: '' },
      { code: '2', value: 'czenas' },
      { code: '7', value: '' },
    ],
    repeatable: true,
    type: 'data' as FieldType,
  },
];
