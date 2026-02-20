import { Injectable, signal } from '@angular/core';
import { MarcSubfield, UUID } from '../models';

export type SelectedField = {
  fieldId: UUID;
  tag: string;
  subfields?: MarcSubfield[];
  value?: string;
};

@Injectable({ providedIn: 'root' })
export class FieldEditService {
  field = signal<SelectedField | null>(null);
}
