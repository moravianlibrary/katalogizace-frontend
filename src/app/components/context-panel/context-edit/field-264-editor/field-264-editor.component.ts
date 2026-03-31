import {
  AddSubfieldDialogComponent,
  AddSubfieldDialogResult,
} from '@/app/components/add-subfield-dialog/add-subfield-dialog.component';
import { InputAutocompleteComponent } from '@/app/components/inputs/input-autocomplete/input-autocomplete.component';
import { InputDropdownComponent } from '@/app/components/inputs/input-dropdown/input-dropdown.component';
import {
  FIELD_RULES,
  MarcSubfield,
  UUID,
  getIndicators,
  getSubfieldRuleLabel,
  isSubfieldRepeatable,
} from '@/app/models';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { bindAddSubfieldShortcut } from '@/app/utils/bind-add-subfield-shortcut';
import { compareSubfieldCodes } from '@/app/utils/marc-subfield-sort';
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
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
  templateLocked: boolean;
};

type PendingFocusTarget = {
  code: string;
  occurrence: number;
  kind: 'template' | 'extra';
} | null;

@Component({
  standalone: true,
  selector: 'app-field-264-editor',
  imports: [
    CommonModule,
    TranslateModule,
    InputDropdownComponent,
    InputAutocompleteComponent,
    AddSubfieldDialogComponent,
  ],
  templateUrl: './field-264-editor.component.html',
})
export class Field264EditorComponent {
  private readonly rs = inject(RecordStateService);
  private readonly cps = inject(ContextPanelService);

  private wasEditingThisField = false;

  fieldId = input.required<UUID>();

  readonly addSubfieldDialogOpen = signal(false);
  readonly addSubfieldDialogError = signal<string | null>(null);

  private readonly firstAutocomplete = viewChild(InputAutocompleteComponent);
  private readonly allAutocompletes = viewChildren(InputAutocompleteComponent);
  private readonly plainInputs =
    viewChildren<ElementRef<HTMLInputElement>>('plainInput');

  readonly pendingFocusTarget = signal<PendingFocusTarget>(null);

  readonly tag = '264';

  readonly indicators = computed(() => getIndicators(this.tag));
  readonly ind1Options = computed(() => this.indicators().ind1);
  readonly ind2Options = computed(() => this.indicators().ind2);

  readonly templateOrder = computed(() => {
    return FIELD_RULES[this.tag]?.templateOrder ?? ['a', 'b', 'c'];
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
    const templateItems: VisibleSubfield[] = [];

    for (const code of this.templateOrder()) {
      const rule = FIELD_RULES[this.tag]?.subfields?.[code];
      const matching = subfields
        .map((sf, sourceIndex) => ({ sf, sourceIndex }))
        .filter(({ sf }) => sf.code === code);

      if (rule?.repeatable) {
        if (matching.length) {
          matching.forEach(({ sf, sourceIndex }, index) => {
            templateItems.push({
              kind: 'template',
              code,
              value: sf.value,
              sourceIndex,
              templateLocked: index === 0,
            });
          });
        } else {
          templateItems.push({
            kind: 'template',
            code,
            value: '',
            sourceIndex: null,
            templateLocked: true,
          });
        }
        continue;
      }

      const first = matching[0];
      templateItems.push({
        kind: 'template',
        code,
        value: first?.sf.value ?? '',
        sourceIndex: first?.sourceIndex ?? null,
        templateLocked: true,
      });
    }

    const templateCodes = this.templateCodes();

    const extraItems: VisibleSubfield[] = subfields
      .map((sf, sourceIndex) => ({ sf, sourceIndex }))
      .filter(({ sf }) => !templateCodes.has(sf.code))
      .sort((a, b) => compareSubfieldCodes(a.sf.code, b.sf.code))
      .map(({ sf, sourceIndex }) => ({
        kind: 'extra',
        code: sf.code,
        value: sf.value,
        sourceIndex,
        templateLocked: false,
      }));

    return [...templateItems, ...extraItems];
  });

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

      queueMicrotask(() => this.firstAutocomplete()?.focus());
    });

    effect(() => {
      const target = this.pendingFocusTarget();
      const visible = this.visibleSubfields();
      if (!target || !visible.length) return;

      queueMicrotask(() => {
        if (target.kind === 'template') {
          const sameCodeVisibleIndexes = visible
            .map((sf, index) => ({ sf, index }))
            .filter(
              (x) => x.sf.kind === 'template' && x.sf.code === target.code,
            )
            .map((x) => x.index);

          const visibleIndex = sameCodeVisibleIndexes[target.occurrence - 1];
          if (visibleIndex == null) return;

          if (target.code === 'a' || target.code === 'b') {
            const autocompleteVisibleIndexes = visible
              .map((sf, index) =>
                sf.kind === 'template' && (sf.code === 'a' || sf.code === 'b')
                  ? index
                  : -1,
              )
              .filter((index) => index !== -1);

            const autocompleteIndex =
              autocompleteVisibleIndexes.indexOf(visibleIndex);
            if (autocompleteIndex < 0) return;

            this.allAutocompletes()[autocompleteIndex]?.focus();
            this.pendingFocusTarget.set(null);
            return;
          }

          if (target.code === 'c') {
            const plainVisibleIndexes = visible
              .map((sf, index) =>
                sf.kind === 'template' && sf.code === 'c' ? index : -1,
              )
              .filter((index) => index !== -1);

            const plainIndex = plainVisibleIndexes.indexOf(visibleIndex);
            if (plainIndex < 0) return;

            this.plainInputs()[plainIndex]?.nativeElement.focus();
            this.pendingFocusTarget.set(null);
            return;
          }
        }

        if (target.kind === 'extra') {
          const extraVisibleIndexes = visible
            .map((sf, index) => ({ sf, index }))
            .filter((x) => x.sf.kind === 'extra' && x.sf.code === target.code)
            .map((x) => x.index);

          const visibleIndex = extraVisibleIndexes[target.occurrence - 1];
          if (visibleIndex == null) return;

          const plainVisibleIndexes = visible
            .map((sf, index) =>
              sf.code === 'c' || sf.kind === 'extra' ? index : -1,
            )
            .filter((index) => index !== -1);

          const plainIndex = plainVisibleIndexes.indexOf(visibleIndex);
          if (plainIndex < 0) return;

          this.plainInputs()[plainIndex]?.nativeElement.focus();
          this.pendingFocusTarget.set(null);
        }
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

  setInd(ind: 1 | 2, value: string) {
    const v = String(value ?? '').slice(0, 1);
    if (ind === 1) this.rs.patchDataField(this.fieldId(), { ind1: v });
    else this.rs.patchDataField(this.fieldId(), { ind2: v });
  }

  setTemplateSubValue(sf: VisibleSubfield, value: string) {
    const f = this.field();
    if (!f) return;

    const subfields = [...(f.subfields ?? [])];

    if (sf.sourceIndex != null) {
      subfields[sf.sourceIndex] = {
        ...subfields[sf.sourceIndex],
        value,
      };
    } else if (value) {
      subfields.push({ code: sf.code, value });
    } else {
      return;
    }

    this.rs.patchDataField(this.fieldId(), { subfields });
  }

  setExtraSubValue(sourceIndex: number, value: string) {
    this.rs.patchSubfield(this.fieldId(), sourceIndex, { value });
  }

  deleteTemplateRepeatableSubfield(sourceIndex: number) {
    const field = this.field();
    if (!field) return;

    const subfields = [...(field.subfields ?? [])];
    if (sourceIndex < 0 || sourceIndex >= subfields.length) return;

    subfields.splice(sourceIndex, 1);
    this.rs.patchDataField(this.fieldId(), { subfields });
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
      const isTemplateCode = templateCodes.has(code);
      const repeatable = isSubfieldRepeatable(this.tag, code) ?? true;
      const alreadyExists = existingSubfields.some((sf) => sf.code === code);

      if (isTemplateCode && !repeatable) {
        this.addSubfieldDialogError.set('subfield_add.non_repeatable_error');
        return;
      }

      if (!repeatable && alreadyExists) {
        this.addSubfieldDialogError.set('subfield_add.non_repeatable_error');
        return;
      }
    }

    const firstAddedCode = result.subfieldCodes[0] ?? null;
    const firstAddedIsTemplate =
      !!firstAddedCode && templateCodes.has(firstAddedCode);

    const existingSameCodeCount = firstAddedCode
      ? existingSubfields.filter((sf) => sf.code === firstAddedCode).length
      : 0;

    const existingExtraSameCodeCount = firstAddedCode
      ? existingSubfields.filter(
          (sf) => !templateCodes.has(sf.code) && sf.code === firstAddedCode,
        ).length
      : 0;

    const added: MarcSubfield[] = result.subfieldCodes.map((code) => ({
      code,
      value: '',
    }));

    this.rs.patchDataField(this.fieldId(), {
      subfields: [...existingSubfields, ...added],
    });

    this.pendingFocusTarget.set(
      firstAddedCode
        ? {
            code: firstAddedCode,
            kind: firstAddedIsTemplate ? 'template' : 'extra',
            occurrence: firstAddedIsTemplate
              ? existingSameCodeCount + 1
              : existingExtraSameCodeCount + 1,
          }
        : null,
    );

    this.addSubfieldDialogOpen.set(false);
    this.addSubfieldDialogError.set(null);
  }

  shouldUseAutocomplete(code: string): boolean {
    return code === 'a' || code === 'b';
  }

  getSubfieldLabel(code: string): string {
    return getSubfieldRuleLabel(this.tag, code) ?? `|${code}`;
  }
}
