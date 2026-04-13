import { DropdownOption, getIndicators } from './dropdown.model';

export type SubfieldRule = {
  repeatable: boolean;
  label: string;
};

export type DataFieldRule = {
  ind1Options?: DropdownOption[];
  ind2Options?: DropdownOption[];
  subfields?: Record<string, SubfieldRule>;
  templateOrder?: string[];
  repeatable: boolean;
};

export type ControlFieldRule = {
  repeatable: boolean;
};

export type ControlFieldRulesMap = Record<string, ControlFieldRule>;
export type DataFieldRulesMap = Record<string, DataFieldRule>;

export const CONTROL_FIELD_RULES: ControlFieldRulesMap = {
  '001': { repeatable: false },
  '003': { repeatable: false },
  '005': { repeatable: false },
  '007': { repeatable: true },
  '008': { repeatable: false },
};

export const DATA_FIELD_RULES: DataFieldRulesMap = {
  '015': { repeatable: true },
  '020': { repeatable: true },
  '040': { repeatable: false },
  '041': { repeatable: true },
  '044': { repeatable: false },
  '072': { repeatable: true },
  '080': { repeatable: true },
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
  },
  '110': { repeatable: false },
  '111': { repeatable: false },
  '130': { repeatable: false },
  '240': { repeatable: false },
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
  },
  '246': { repeatable: true },
  '250': { repeatable: true },
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
  },
  '336': { repeatable: true },
  '337': { repeatable: true },
  '338': { repeatable: true },
  '362': { repeatable: true },
  '490': { repeatable: true },
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
  },
  '502': { repeatable: true },
  '504': { repeatable: true },
  '505': { repeatable: true },
  '520': { repeatable: true },
  '546': { repeatable: true },
  '550': { repeatable: true },
  '588': { repeatable: true },
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
    templateOrder: ['2', 'a', '7'],
    repeatable: true,
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
    templateOrder: ['2', 'a', '7'],
    repeatable: true,
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
    templateOrder: ['2', 'a', '7'],
    repeatable: true,
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
  },
  '710': { repeatable: true },
  '711': { repeatable: true },
  '730': { repeatable: true },
  '740': { repeatable: true },
  '765': { repeatable: true },
  '787': { repeatable: true },
  '800': { repeatable: true },
  '810': { repeatable: true },
  '811': { repeatable: true },
  '830': { repeatable: true },
};

export function isFieldRepeatable(tag: string) {
  return (
    DATA_FIELD_RULES[tag]?.repeatable ??
    CONTROL_FIELD_RULES[tag]?.repeatable ??
    false
  );
}

export function isSubfieldRepeatable(tag: string, code: string) {
  return DATA_FIELD_RULES[tag]?.subfields?.[code]?.repeatable ?? false;
}

export function getSubfields(tag: string) {
  return DATA_FIELD_RULES[tag]?.subfields ?? {};
}

export function getSubfieldRuleLabel(tag: string, code: string) {
  return DATA_FIELD_RULES[tag]?.subfields?.[code]?.label ?? '';
}
