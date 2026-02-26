import { InputAutocompleteAuthorityComponent } from '@/app/components/inputs/input-autocomplete-authority/input-autocomplete-authority.component';
import { InputDropdownComponent } from '@/app/components/inputs/input-dropdown/input-dropdown.component';
import { InputStaticAutocompleteComponent } from '@/app/components/inputs/input-static-autocomplete/input-static-autocomplete.component';
import {
  AutocompletAuthorityResponse,
  INDICATOR_OPTIONS,
  UUID,
} from '@/app/models';
import { MarcTranslateService } from '@/app/services/marc-translate.service';
import { RecordStateService } from '@/app/services/record-state.service';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-field-authority-editor',
  imports: [
    InputAutocompleteAuthorityComponent,
    InputDropdownComponent,
    TranslateModule,
    InputStaticAutocompleteComponent,
  ],
  templateUrl: './field-authority-editor.component.html',
})
export class FieldAuthorityEditorComponent {
  private readonly rs = inject(RecordStateService);
  private readonly marcT = inject(MarcTranslateService);

  fieldId = input.required<UUID>();

  INDICATOR_OPTIONS = INDICATOR_OPTIONS;

  private readonly firstAutocomplete = viewChild(
    InputAutocompleteAuthorityComponent,
  );

  readonly roleItems = computed(() =>
    this.marcT.getMarcStaticValueItems('100.4'),
  );

  readonly field = computed(() => {
    const rec = this.rs.editableRecord();
    if (!rec) return null;
    return rec.data_fields.find((f) => f.fieldId === this.fieldId()) ?? null;
  });

  readonly locked = computed(() => (this.getSub('7') ?? '').trim().length > 0);

  readonly hasSub7 = computed(() => (this.getSub('7') ?? '').trim().length > 0);
  readonly hasSubd = computed(() => (this.dDraft() ?? '').trim().length > 0);

  readonly dDraft = signal<string>('');
  private readonly hasAutoFocused = signal(false);

  constructor() {
    effect(() => {
      this.fieldId();
      this.hasAutoFocused.set(false);
    });

    effect(() => {
      this.fieldId(); // dependency
      const v = this.getSub('d') ?? '';
      this.dDraft.set(v);
    });

    effect(() => {
      const id = this.fieldId();
      const f = this.field();
      if (!id || !f) return;

      const isLocked = this.locked();
      if (isLocked) return;
      if (this.hasAutoFocused()) return;

      this.hasAutoFocused.set(true);
      queueMicrotask(() => this.firstAutocomplete()?.focus());
    });
  }

  setInd(which: 1 | 2, v: string) {
    const f = this.field();
    if (!f) return;
    this.rs.patchDataField(this.fieldId(), {
      [which === 1 ? 'ind1' : 'ind2']: v,
    } as any);
  }

  getSub(code: '4' | 'd' | 'a' | '7'): string {
    const f = this.field();
    if (!f) return '';
    return f.subfields?.find((s: any) => s.code === code)?.value ?? '';
  }

  setSub(code: '4' | 'd' | 'a' | '7', value: string) {
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

  onPickTerm(term: string) {
    if (this.locked()) return;
    this.setSub('a', term);
  }

  onInputD(e: Event) {
    if (this.locked()) return;
    const value = (e.target as HTMLInputElement | null)?.value ?? '';
    this.dDraft.set(value);
    this.setSub('d', value);
  }

  clearD() {
    this.dDraft.set('');
    this.setSub('d', '');
  }

  applySuggestion(s: AutocompletAuthorityResponse) {
    if (this.locked()) return;
    this.setSub('a', s.a);
    this.setSub('7', s['7'] ?? '');
    this.setSub('d', s['d'] ?? '');
  }

  clearAuthority() {
    this.setSub('a', '');
    this.setSub('7', '');
    this.setSub('d', '');
  }
}
