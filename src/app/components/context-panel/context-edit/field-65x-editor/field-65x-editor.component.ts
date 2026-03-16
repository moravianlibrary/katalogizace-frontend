import { InputAutocompleteDictionaryComponent } from '@/app/components/inputs/input-autocomplete-dictionary/input-autocomplete-dictionary.component';
import { InputDropdownComponent } from '@/app/components/inputs/input-dropdown/input-dropdown.component';
import {
  AutocompletDictionaryResponse,
  ExistingMarcRecord,
  UUID,
} from '@/app/models';
import {
  DropdownOption,
  getIndicators,
} from '@/app/models/shared/dropdown.model';
import { CatalogueService } from '@/app/services/api/catalogue.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
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
  private readonly catalogue = inject(CatalogueService);

  fieldId = input.required<UUID>();

  fieldType = input.required<'df_650' | 'df_651' | 'df_655'>();

  readonly tag = computed(() => {
    switch (this.fieldType()) {
      case 'df_651':
        return '651';
      case 'df_655':
        return '655';
      default:
        return '650';
    }
  });

  readonly indicators = computed(() => getIndicators(this.tag()));
  readonly ind1Options = computed(() => this.indicators().ind1);
  readonly ind2Options = computed(() => this.indicators().ind2);

  sevenRecord = signal<ExistingMarcRecord | null>(null);
  private readonly loadingSevenRecord = signal(false);
  private readonly loadedSevenId = signal<string | null>(null);

  catalogueUrlSeven = computed<string | null>(() => {
    const rec = this.sevenRecord();
    const docNumber = this.getDocNumberFromRecord(rec);

    if (!docNumber) return null;

    return `https://aleph.nkp.cz/F/?func=direct&doc_number=${encodeURIComponent(docNumber)}&local_base=AUT`;
  });

  private getDocNumberFromRecord(
    rec: ExistingMarcRecord | null,
  ): string | null {
    if (!rec) return null;

    const f998 = rec.data_fields.find((f) => f.tag === '998');
    const sfA = f998?.subfields?.find((sf) => sf.code === 'a');
    const value = sfA?.value?.trim();

    return value ?? null;
  }

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

    effect(() => {
      const id = (this.getSub('7') ?? '').trim();

      if (!id) {
        this.sevenRecord.set(null);
        this.loadedSevenId.set(null);
        return;
      }

      if (this.loadedSevenId() === id || this.loadingSevenRecord()) return;

      this.loadingSevenRecord.set(true);

      this.catalogue.getAutRecord(id, 'aut').subscribe({
        next: (record) => {
          if ((this.getSub('7') ?? '').trim() !== id) {
            this.loadingSevenRecord.set(false);
            return;
          }

          this.sevenRecord.set(record);
          this.loadedSevenId.set(id);
          this.loadingSevenRecord.set(false);
        },
        error: () => {
          if ((this.getSub('7') ?? '').trim() === id) {
            this.sevenRecord.set(null);
            this.loadedSevenId.set(null);
          }
          this.loadingSevenRecord.set(false);
        },
      });
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

    if (code === '7') {
      const trimmed = value.trim();
      this.loadedSevenId.set(null);

      if (!trimmed) {
        this.sevenRecord.set(null);
      }
    }
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
