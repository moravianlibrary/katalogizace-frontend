import {
  AddSubfieldDialogComponent,
  AddSubfieldDialogResult,
} from '@/app/components/dialogs/add-subfield-dialog/add-subfield-dialog.component';
import { IconComponent } from '@/app/components/shared/icon/icon.component';
import { InputAutocompleteComponent } from '@/app/components/shared/inputs/input-autocomplete/input-autocomplete.component';
import { InputDropdownComponent } from '@/app/components/shared/inputs/input-dropdown/input-dropdown.component';
import { TextareaAutocompleteComponent } from '@/app/components/shared/inputs/textarea-autocomplete/textarea-autocomplete.component';
import {
  DATA_FIELD_RULES,
  getIndicators,
  getSubfieldRuleLabel,
  isSubfieldRepeatable,
  MarcSubfield,
  UUID,
} from '@/app/models';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { bindAddSubfieldShortcut } from '@/app/utils/bind-add-subfield-shortcut';
import { compareSubfieldCodes } from '@/app/utils/marc-subfield-sort';
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
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
  selector: 'app-field-500-editor',
  imports: [
    CommonModule,
    TranslateModule,
    TextareaAutocompleteComponent,
    InputAutocompleteComponent,
    AddSubfieldDialogComponent,
    InputDropdownComponent,
    IconComponent,
  ],
  templateUrl: './field-500-editor.component.html',
})
export class Field500EditorComponent {
  private readonly rs = inject(RecordStateService);
  private readonly cps = inject(ContextPanelService);

  private wasEditingThisField = false;

  fieldId = input.required<UUID>();

  readonly addSubfieldDialogOpen = signal(false);
  readonly addSubfieldDialogError = signal<string | null>(null);

  private readonly firstTextarea = viewChild(TextareaAutocompleteComponent);
  private readonly extraAutocompletes = viewChildren(
    InputAutocompleteComponent,
  );

  readonly pendingFocusTarget = signal<PendingFocusTarget>(null);

  readonly tag = '500';

  readonly indicators = computed(() => getIndicators(this.tag));
  readonly ind1Options = computed(() => this.indicators().ind1);
  readonly ind2Options = computed(() => this.indicators().ind2);

  setInd(ind: 1 | 2, raw: string) {
    const v = (raw ?? '').slice(0, 1);
    if (ind === 1) {
      this.rs.patchDataField(this.fieldId(), { ind1: v });
    } else {
      this.rs.patchDataField(this.fieldId(), { ind2: v });
    }
  }

  readonly templateOrder = computed(() => {
    return DATA_FIELD_RULES[this.tag]?.templateOrder ?? ['a'];
  });

  readonly templateCodes = computed(() => new Set(this.templateOrder()));

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

  readonly extraVisibleSubfields = computed(() =>
    this.visibleSubfields().filter((sf) => sf.kind === 'extra'),
  );

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
      const state = this.cps.state();
      const isEditingThisField =
        state.mode === 'edit' && state.fieldId === this.fieldId();

      if (!isEditingThisField) return;

      queueMicrotask(() => this.firstTextarea()?.focus());
    });

    effect(() => {
      const target = this.pendingFocusTarget();
      const extras = this.extraVisibleSubfields();
      if (!target || !extras.length) return;

      queueMicrotask(() => {
        let occurrence = 0;

        const targetIndex = extras.findIndex((sf) => {
          if (sf.code !== target.code) return false;

          occurrence++;
          return occurrence === target.occurrence;
        });

        if (targetIndex === -1) return;

        this.extraAutocompletes()[targetIndex]?.focus();
        this.pendingFocusTarget.set(null);
      });
    });

    bindAddSubfieldShortcut({
      cps: this.cps,
      fieldId: () => this.fieldId(),
      openDialog: () => this.openAddSubfieldDialog(),
    });
  }

  ngOnDestroy(): void {
    this.cleanupEmptySubfields();
  }

  private cleanupEmptySubfields() {
    const field = this.field();
    if (!field) return;

    const current = field.subfields ?? [];
    const cleaned = current.filter((sf) => (sf.value ?? '').trim().length > 0);

    if (cleaned.length === current.length) return;

    this.rs.patchDataField(this.fieldId(), { subfields: cleaned });
  }

  setTemplateSub(code: 'a', value: string) {
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

      const repeatable = isSubfieldRepeatable(this.tag, code);
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
    return getSubfieldRuleLabel(this.tag, code);
  }
}
