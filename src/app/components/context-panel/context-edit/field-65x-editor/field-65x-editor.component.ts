import {
  AddSubfieldDialogComponent,
  AddSubfieldDialogResult,
} from '@/app/components/add-subfield-dialog/add-subfield-dialog.component';
import { InputAutocompleteDictionaryComponent } from '@/app/components/inputs/input-autocomplete-dictionary/input-autocomplete-dictionary.component';
import { InputDropdownComponent } from '@/app/components/inputs/input-dropdown/input-dropdown.component';
import { LockHoverIconComponent } from '@/app/components/shared/lock-hover-icon/lock-hover-icon.component';
import {
  AutocompletDictionaryResponse,
  ExistingMarcRecord,
  FIELD_RULES,
  getSubfieldRuleLabel,
  isSubfieldRepeatable,
  MarcSubfield,
  UUID,
} from '@/app/models';
import {
  DropdownOption,
  getIndicators,
} from '@/app/models/shared/dropdown.model';
import { CatalogueService } from '@/app/services/api/catalogue.service';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { compareSubfieldCodes } from '@/app/utils/marc-subfield-sort';
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

type VisibleSubfield = {
  kind: 'template' | 'extra';
  code: string;
  value: string;
  sourceIndex: number | null;
};

type PendingFocusTarget = {
  code: string;
  occurrence: number;
} | null;

@Component({
  standalone: true,
  selector: 'app-field-65x-editor',
  imports: [
    CommonModule,
    TranslateModule,
    InputDropdownComponent,
    InputAutocompleteDictionaryComponent,
    LockHoverIconComponent,
    AddSubfieldDialogComponent,
  ],
  templateUrl: './field-65x-editor.component.html',
})
export class Field65xEditorComponent {
  private readonly rs = inject(RecordStateService);
  private readonly catalogue = inject(CatalogueService);
  private readonly cps = inject(ContextPanelService);
  private wasEditingThisField = false;

  fieldId = input.required<UUID>();

  fieldType = input.required<'df_650' | 'df_651' | 'df_655'>();

  readonly addSubfieldDialogOpen = signal(false);
  readonly addSubfieldDialogError = signal<string | null>(null);

  private readonly plainInputs =
    viewChildren<ElementRef<HTMLInputElement>>('plainInput');

  readonly pendingFocusTarget = signal<PendingFocusTarget>(null);

  readonly extraVisibleSubfields = computed(() =>
    this.visibleSubfields().filter((sf) => sf.kind === 'extra'),
  );

  private cleanupEmptySubfields() {
    const field = this.field();
    if (!field) return;

    const current = field.subfields ?? [];
    const cleaned = current.filter((sf) => (sf.value ?? '').trim().length > 0);

    if (cleaned.length === current.length) return;

    this.rs.patchDataField(this.fieldId(), { subfields: cleaned });
  }

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

  readonly templateOrder = computed(() => {
    return FIELD_RULES[this.tag()]?.templateOrder ?? [];
  });

  readonly templateCodes = computed(() => new Set(this.templateOrder()));

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

  private readonly firstPlainAInput =
    viewChild<ElementRef<HTMLInputElement>>('plainAInput');

  constructor() {
    effect(() => {
      const state = this.cps.state();
      const isEditingThisField =
        state.mode === 'edit' && state.fieldId === this.fieldId();

      if (this.wasEditingThisField && !isEditingThisField) {
        this.cleanupEmptySubfields();
      }

      this.wasEditingThisField = isEditingThisField;
    });

    effect(() => {
      const id = this.fieldId();
      if (!id) return;

      const isLocked = untracked(() => this.locked());
      if (isLocked) return;

      queueMicrotask(() => {
        if (this.dictionary()) {
          this.firstAutocomplete()?.focus();
        } else {
          this.firstPlainAInput()?.nativeElement.focus();
        }
      });
    });

    effect(() => {
      const id = (this.getTemplateSubValue('7') ?? '').trim();

      if (!id) {
        this.sevenRecord.set(null);
        this.loadedSevenId.set(null);
        return;
      }

      if (this.loadedSevenId() === id || this.loadingSevenRecord()) return;

      this.loadingSevenRecord.set(true);

      this.catalogue.getAutRecord(id, 'aut').subscribe({
        next: (record) => {
          if ((this.getTemplateSubValue('7') ?? '').trim() !== id) {
            this.loadingSevenRecord.set(false);
            return;
          }

          this.sevenRecord.set(record);
          this.loadedSevenId.set(id);
          this.loadingSevenRecord.set(false);
        },
        error: () => {
          if ((this.getTemplateSubValue('7') ?? '').trim() === id) {
            this.sevenRecord.set(null);
            this.loadedSevenId.set(null);
          }
          this.loadingSevenRecord.set(false);
        },
      });
    });

    effect(() => {
      const target = this.pendingFocusTarget();
      const extras = this.extraVisibleSubfields();
      if (!target || !extras.length) return;

      queueMicrotask(() => {
        const matchingIndexes = extras
          .map((sf, index) => ({ code: sf.code, index }))
          .filter((x) => x.code === target.code)
          .map((x) => x.index);

        const targetIndex = matchingIndexes[target.occurrence - 1];
        if (targetIndex == null) return;

        this.plainInputs()[targetIndex]?.nativeElement.focus();
        this.pendingFocusTarget.set(null);
      });
    });
  }

  ngOnDestroy(): void {
    this.cleanupEmptySubfields();
  }

  readonly DICT_OPTIONS: DropdownOption[] = [
    { value: 'czenas', label: 'czenas' },
    { value: 'eczenas', label: 'eczenas' },
    { value: '', label: '-' },
  ];

  readonly field = computed(() => {
    const rec = this.rs.editableRecord();
    if (!rec) return null;
    return rec.data_fields.find((f) => f.fieldId === this.fieldId()) ?? null;
  });

  readonly visibleSubfields = computed<VisibleSubfield[]>(() => {
    const field = this.field();
    if (!field) return [];

    const subfields = field.subfields ?? [];
    const templateCodes = this.templateCodes();

    const templateItems: VisibleSubfield[] = this.templateOrder().map(
      (code) => ({
        kind: 'template',
        code,
        value: subfields.find((sf) => sf.code === code)?.value ?? '',
        sourceIndex: null,
      }),
    );

    const extraItems: VisibleSubfield[] = subfields
      .map((sf, sourceIndex) => ({ sf, sourceIndex }))
      .filter(({ sf }) => !templateCodes.has(sf.code))
      .sort((a, b) => compareSubfieldCodes(a.sf.code, b.sf.code))
      .map(({ sf, sourceIndex }) => ({
        kind: 'extra',
        code: sf.code,
        value: sf.value,
        sourceIndex,
      }));

    return [...templateItems, ...extraItems];
  });

  readonly dictionary = computed(() => {
    const v = (this.getTemplateSubValue('2') ?? '').trim();

    if (v === 'eczenas') return 'eczenas';
    if (v === 'czenas') return 'czenas';
    return '';
  });

  readonly hasDictionary = computed(() => this.dictionary() !== '');

  readonly autocompleteDictionary = computed<'czenas' | 'eczenas'>(() => {
    return this.dictionary() === 'eczenas' ? 'eczenas' : 'czenas';
  });

  readonly locked = computed(() => {
    return (this.getTemplateSubValue('7') ?? '').trim().length > 0;
  });

  setInd(which: 1 | 2, v: string) {
    const f = this.field();
    if (!f) return;
    this.rs.patchDataField(this.fieldId(), {
      [which === 1 ? 'ind1' : 'ind2']: v,
    } as any);
  }

  getTemplateSubValue(code: '2' | 'a' | '7'): string {
    const f = this.field();
    if (!f) return '';
    return f.subfields?.find((s) => s.code === code)?.value ?? '';
  }

  setTemplateSub(code: '2' | 'a' | '7', value: string) {
    const f = this.field();
    if (!f) return;

    const subfields = [...(f.subfields ?? [])];
    const idx = subfields.findIndex((s) => s.code === code);

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

  setExtraSubValue(sourceIndex: number, value: string) {
    this.rs.patchSubfield(this.fieldId(), sourceIndex, { value });
  }

  deleteExtraSubfield(sourceIndex: number) {
    const field = this.field();
    if (!field) return;

    const subfields = [...(field.subfields ?? [])];
    if (sourceIndex < 0 || sourceIndex >= subfields.length) return;

    subfields.splice(sourceIndex, 1);
    this.rs.patchDataField(this.fieldId(), { subfields });
  }

  onDictionaryChange(v: string) {
    if (this.locked()) return;

    const dict = v === 'eczenas' ? 'eczenas' : v === 'czenas' ? 'czenas' : '';

    this.setTemplateSub('2', dict);
    this.setTemplateSub('a', '');
    this.setTemplateSub('7', '');
  }

  onPickTerm(term: string) {
    if (this.locked()) return;
    this.setTemplateSub('a', term);
  }

  applySuggestion(s: AutocompletDictionaryResponse) {
    if (this.locked()) return;
    this.setTemplateSub('a', s.a);
    this.setTemplateSub('7', s['7'] ?? '');
  }

  private patchAuthorityTemplate(values: { a?: string; '7'?: string }) {
    const field = this.field();
    if (!field) return;

    const subfields = [...(field.subfields ?? [])];

    const upsert = (code: 'a' | '7', value: string) => {
      const idx = subfields.findIndex((sf) => sf.code === code);

      if (!value) {
        if (idx >= 0) subfields.splice(idx, 1);
        return;
      }

      if (idx >= 0) {
        subfields[idx] = { ...subfields[idx], value };
      } else {
        subfields.push({ code, value });
      }
    };

    if ('a' in values) upsert('a', values.a ?? '');
    if ('7' in values) upsert('7', values['7'] ?? '');

    this.loadedSevenId.set(null);

    if (!(values['7'] ?? '').trim()) {
      this.sevenRecord.set(null);
    }

    this.rs.patchDataField(this.fieldId(), { subfields });
  }

  clearAuthority() {
    this.patchAuthorityTemplate({
      '7': '',
    });

    setTimeout(() => {
      this.firstAutocomplete()?.focus();
    });
  }

  openAddSubfieldDialog() {
    this.addSubfieldDialogError.set(null);
    this.addSubfieldDialogOpen.set(true);
  }

  closeAddSubfieldDialog() {
    this.addSubfieldDialogOpen.set(false);
    this.addSubfieldDialogError.set(null);
  }

  onAddSubfieldConfirm(result: AddSubfieldDialogResult) {
    const field = this.field();
    if (!field) return;

    const existingSubfields = [...(field.subfields ?? [])];
    const templateCodes = this.templateCodes();

    for (const code of result.subfieldCodes) {
      if (templateCodes.has(code)) {
        this.addSubfieldDialogError.set('subfield_add.non_repeatable_error');
        return;
      }

      const repeatable = isSubfieldRepeatable(this.tag(), code) ?? true;
      const alreadyExists = existingSubfields.some((sf) => sf.code === code);

      if (!repeatable && alreadyExists) {
        this.addSubfieldDialogError.set('subfield_add.non_repeatable_error');
        return;
      }
    }

    const firstAddedCode = result.subfieldCodes[0] ?? null;

    const existingExtraSameCodeCount = firstAddedCode
      ? existingSubfields.filter(
          (sf) => !templateCodes.has(sf.code) && sf.code === firstAddedCode,
        ).length
      : 0;

    const added: MarcSubfield[] = result.subfieldCodes.map((code) => ({
      code,
      value: '',
    }));

    const extras = [...existingSubfields, ...added]
      .filter((sf) => !templateCodes.has(sf.code))
      .sort((a, b) => compareSubfieldCodes(a.code, b.code));

    const templates = existingSubfields.filter((sf) =>
      templateCodes.has(sf.code),
    );

    this.rs.patchDataField(this.fieldId(), {
      subfields: [...templates, ...extras],
    });

    this.pendingFocusTarget.set(
      firstAddedCode
        ? {
            code: firstAddedCode,
            occurrence: existingExtraSameCodeCount + 1,
          }
        : null,
    );

    this.addSubfieldDialogOpen.set(false);
    this.addSubfieldDialogError.set(null);
  }

  getSubfieldLabel(code: string): string {
    return getSubfieldRuleLabel(this.tag(), code) ?? `|${code}`;
  }

  isTemplateSubfield(code: string): boolean {
    return this.templateCodes().has(code);
  }
}
