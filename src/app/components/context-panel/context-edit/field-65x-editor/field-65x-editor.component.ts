import { InputAutocompleteDictionaryComponent } from '@/app/components/inputs/input-autocomplete-dictionary/input-autocomplete-dictionary.component';
import { InputDropdownComponent } from '@/app/components/inputs/input-dropdown/input-dropdown.component';
import { AutocompletDictionaryResponse, UUID } from '@/app/models';
import {
  DropdownOption,
  INDICATOR_OPTIONS,
} from '@/app/models/shared/dropdown.model';
import { RecordStateService } from '@/app/services/record-state.service';
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-field-65x-editor',
  imports: [
    CommonModule,
    TranslateModule,
    InputDropdownComponent,
    InputAutocompleteDictionaryComponent,
  ],
  templateUrl: './field-65x-editor.component.html',
})
export class Field65xEditorComponent {
  private readonly rs = inject(RecordStateService);

  fieldId = input.required<UUID>();

  fieldType = input.required<'df_650' | 'df_651' | 'df_655'>();

  INDICATOR_OPTIONS = INDICATOR_OPTIONS;

  private readonly firstAutocomplete = viewChild(
    InputAutocompleteDictionaryComponent,
  );

  constructor() {
    effect(() => {
      const id = this.fieldId();
      const f = this.field();
      if (!id || !f) return;

      const isLocked = untracked(() => this.locked());
      if (isLocked) return;

      queueMicrotask(() => this.firstAutocomplete()?.focus());
    });
  }

  readonly DICT_OPTIONS: DropdownOption[] = [
    { value: 'czenas', label: 'czenas' },
    { value: 'eczenas', label: 'eczenas' },
  ];

  readonly field = computed(() => {
    const rec = this.rs.editableRecord();
    if (!rec) return null;
    return rec.data_fields.find((f) => f.fieldId === this.fieldId()) ?? null;
  });

  readonly dictionary = computed(() => {
    const v = (this.getSub('2') ?? '').trim();
    return (v === 'eczenas' ? 'eczenas' : 'czenas') as 'czenas' | 'eczenas';
  });

  readonly locked = computed(() => {
    return (this.getSub('7') ?? '').trim().length > 0;
  });

  setInd(which: 1 | 2, v: string) {
    const f = this.field();
    if (!f) return;
    this.rs.patchDataField(this.fieldId(), {
      [which === 1 ? 'ind1' : 'ind2']: v,
    } as any);
  }

  getSub(code: '2' | 'a' | '7'): string {
    const f = this.field();
    if (!f) return '';
    return f.subfields?.find((s: any) => s.code === code)?.value ?? '';
  }

  setSub(code: '2' | 'a' | '7', value: string) {
    const f = this.field();
    if (!f) return;

    const subfields = [...(f.subfields ?? [])];
    const idx = subfields.findIndex((s: any) => s.code === code);

    if (!value) {
      if (idx >= 0) subfields.splice(idx, 1);
    } else {
      if (idx >= 0) subfields[idx] = { ...subfields[idx], value };
      else subfields.push({ code, value });
    }

    this.rs.patchDataField(this.fieldId(), { subfields });
  }

  onDictionaryChange(v: string) {
    if (this.locked()) return;

    const dict = v === 'eczenas' ? 'eczenas' : 'czenas';

    this.setSub('2', dict);
    this.setSub('a', '');
    this.setSub('7', '');
  }

  onPickTerm(term: string) {
    if (this.locked()) return;
    this.setSub('a', term);
  }

  applySuggestion(s: AutocompletDictionaryResponse) {
    if (this.locked()) return;
    this.setSub('a', s.a);
    this.setSub('7', s['7'] ?? '');
  }

  clearAuthority() {
    this.setSub('a', '');
    this.setSub('7', '');
  }
}
