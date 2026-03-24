import { FieldType } from '../books/record-view.model';
import { DropdownOption, getIndicators } from './dropdown.model';

export type SubfieldRule = {
  repeatable: boolean;
  label: string;
};

export type FieldRule = {
  ind1Options: DropdownOption[];
  ind2Options: DropdownOption[];
  subfields: Record<string, SubfieldRule>;
  templateOrder: string[];
  repeatable: boolean;
  type: FieldType;
};

export type FieldRulesMap = Record<string, FieldRule>;

export const FIELD_RULES: FieldRulesMap = {
  '100': {
    ind1Options: getIndicators('100').ind1,
    ind2Options: getIndicators('100').ind2,
    subfields: {
      a: {
        repeatable: false,
        label: 'field_edit.100.a',
      },
      d: {
        repeatable: false,
        label: 'field_edit.100.d',
      },
      '7': {
        repeatable: false,
        label: 'field_edit.100.7',
      },
      '4': {
        repeatable: true,
        label: 'field_edit.100.4',
      },
    },
    templateOrder: ['a', 'd', '7', '4'],
    repeatable: false,
    type: 'data' as FieldType,
  },
  '245': {
    ind1Options: getIndicators('245').ind1,
    ind2Options: getIndicators('245').ind2,
    subfields: {
      a: {
        repeatable: false,
        label: 'field_edit.245.a',
      },
      b: {
        repeatable: false,
        label: 'field_edit.245.b',
      },
      c: {
        repeatable: false,
        label: 'field_edit.245.c',
      },
    },
    templateOrder: ['a', 'b', 'c'],
    repeatable: false,
    type: 'data' as FieldType,
  },
  '264': {
    ind1Options: getIndicators('264').ind1,
    ind2Options: getIndicators('264').ind2,
    subfields: {
      a: {
        repeatable: true,
        label: 'field_edit.264.a',
      },
      b: {
        repeatable: true,
        label: 'field_edit.264.b',
      },
      c: {
        repeatable: true,
        label: 'field_edit.264.c',
      },
    },
    templateOrder: ['a', 'b', 'c'],
    repeatable: true,
    type: 'data' as FieldType,
  },
  '300': {
    ind1Options: getIndicators('300').ind1,
    ind2Options: getIndicators('300').ind2,
    subfields: {
      a: {
        repeatable: true,
        label: 'field_edit.300.a',
      },
      b: {
        repeatable: false,
        label: 'field_edit.300.b',
      },
      c: {
        repeatable: true,
        label: 'field_edit.300.c',
      },
      e: {
        repeatable: false,
        label: 'field_edit.300.e',
      },
      '3': {
        repeatable: false,
        label: 'field_edit.300.3',
      },
    },
    templateOrder: ['a', 'b', 'c', 'e', '3'],
    repeatable: true,
    type: 'data' as FieldType,
  },
  '500': {
    ind1Options: getIndicators('500').ind1,
    ind2Options: getIndicators('500').ind2,
    subfields: {
      a: {
        repeatable: false,
        label: 'field_edit.500.a',
      },
    },
    templateOrder: ['a'],
    repeatable: true,
    type: 'data' as FieldType,
  },
  '650': {
    ind1Options: getIndicators('650').ind1,
    ind2Options: getIndicators('650').ind2,
    subfields: {
      a: {
        repeatable: false,
        label: 'field_edit.650.a',
      },
      '2': {
        repeatable: false,
        label: 'field_edit.650.2',
      },
      '7': {
        repeatable: false,
        label: 'field_edit.650.7',
      },
    },
    templateOrder: ['a', '2', '7'],
    repeatable: true,
    type: 'data' as FieldType,
  },
  '651': {
    ind1Options: getIndicators('651').ind1,
    ind2Options: getIndicators('651').ind2,
    subfields: {
      a: {
        repeatable: false,
        label: 'field_edit.651.a',
      },
      '2': {
        repeatable: false,
        label: 'field_edit.651.2',
      },
      '7': {
        repeatable: false,
        label: 'field_edit.651.7',
      },
    },
    templateOrder: ['a', '2', '7'],
    repeatable: true,
    type: 'data' as FieldType,
  },
  '655': {
    ind1Options: getIndicators('655').ind1,
    ind2Options: getIndicators('655').ind2,
    subfields: {
      a: {
        repeatable: false,
        label: 'field_edit.655.a',
      },
      '2': {
        repeatable: false,
        label: 'field_edit.655.2',
      },
      '7': {
        repeatable: false,
        label: 'field_edit.655.7',
      },
    },
    templateOrder: ['a', '2', '7'],
    repeatable: true,
    type: 'data' as FieldType,
  },
  '700': {
    ind1Options: getIndicators('700').ind1,
    ind2Options: getIndicators('700').ind2,
    subfields: {
      a: {
        repeatable: false,
        label: 'field_edit.700.a',
      },
      d: {
        repeatable: false,
        label: 'field_edit.700.d',
      },
      '7': {
        repeatable: false,
        label: 'field_edit.700.7',
      },
      '4': {
        repeatable: true,
        label: 'field_edit.700.4',
      },
    },
    templateOrder: ['a', 'd', '7', '4'],
    repeatable: true,
    type: 'data' as FieldType,
  },
};

export function isFieldRepeatable(tag: string) {
  return FIELD_RULES[tag]?.repeatable;
}

export function isSubfieldRepeatable(tag: string, code: string) {
  return FIELD_RULES[tag]?.subfields[code]?.repeatable;
}

export function getSubfields(tag: string) {
  return FIELD_RULES[tag]?.subfields;
}

export function getSubfieldRuleLabel(tag: string, code: string) {
  return FIELD_RULES[tag]?.subfields[code]?.label;
}
