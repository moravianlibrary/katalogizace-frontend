export type DropdownOption = {
  value: string;
  label: string;
};

export type IndicatorConfig = {
  ind1: DropdownOption[];
  ind2: DropdownOption[];
};

const UNDEFINED: DropdownOption = {
  value: '',
  label: 'Nedefinováno',
};

export const INDICATOR_OPTIONS: DropdownOption[] = [
  { value: '', label: 'Nedefinováno' },
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
];

export const FIELD_INDICATORS: Record<string, IndicatorConfig> = {
  '100': {
    ind1: [
      UNDEFINED,
      { value: '0', label: '0' },
      { value: '1', label: '1' },
      { value: '3', label: '3' },
    ],
    ind2: [UNDEFINED],
  },
  '245': {
    ind1: [UNDEFINED, { value: '0', label: '0' }, { value: '1', label: '1' }],
    ind2: INDICATOR_OPTIONS,
  },
  '264': {
    ind1: [UNDEFINED, { value: '2', label: '2' }, { value: '3', label: '3' }],
    ind2: [
      UNDEFINED,
      { value: '0', label: '0' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
    ],
  },
  '500': {
    ind1: [UNDEFINED],
    ind2: [UNDEFINED],
  },
  '650': {
    ind1: [
      UNDEFINED,
      { value: '0', label: '0' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
    ],
    ind2: [UNDEFINED, { value: '4', label: '4' }, { value: '7', label: '7' }],
  },
  '651': {
    ind1: [
      UNDEFINED,
      { value: '0', label: '0' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
    ],
    ind2: [UNDEFINED, { value: '4', label: '4' }, { value: '7', label: '7' }],
  },
  '655': {
    ind1: [UNDEFINED, { value: '0', label: '0' }],
    ind2: [UNDEFINED, { value: '4', label: '4' }, { value: '7', label: '7' }],
  },
  '700': {
    ind1: [
      UNDEFINED,
      { value: '0', label: '0' },
      { value: '1', label: '1' },
      { value: '3', label: '3' },
    ],
    ind2: [UNDEFINED, { value: '2', label: '2' }],
  },
};

export function getIndicators(tag: string): IndicatorConfig {
  return (
    FIELD_INDICATORS[tag] ?? {
      ind1: INDICATOR_OPTIONS,
      ind2: INDICATOR_OPTIONS,
    }
  );
}
