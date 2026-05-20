import { MarcSubfield } from '../books/marc.dto';

export type FieldKind = 'control' | 'data';

export type RecordPatch =
  | {
      kind: 'control.setValue';
      fieldIndex: number;
      value: string;
    }
  | {
      kind: 'data.setInd';
      fieldIndex: number;
      ind: 1 | 2;
      value: string;
    }
  | {
      kind: 'data.setSubfieldValue';
      fieldIndex: number;
      subfieldIndex: number;
      value: string;
    }
  | {
      kind: 'data.setSubfieldCode';
      fieldIndex: number;
      subfieldIndex: number;
      code: string;
    }
  | {
      kind: 'data.addSubfield';
      fieldIndex: number;
      subfield?: MarcSubfield;
    }
  | {
      kind: 'data.removeSubfield';
      fieldIndex: number;
      subfieldIndex: number;
    };
