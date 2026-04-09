import {
  AddSubfieldDialogComponent,
  AddSubfieldDialogResult,
} from '@/app/components/add-subfield-dialog/add-subfield-dialog.component';
import { InputAutocompleteComponent } from '@/app/components/inputs/input-autocomplete/input-autocomplete.component';
import { InputDropdownComponent } from '@/app/components/inputs/input-dropdown/input-dropdown.component';
import {
  DATA_FIELD_RULES,
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
  computed,
  effect,
  inject,
  input,
  signal,
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
  selector: 'app-field-300-editor',
  imports: [
    CommonModule,
    InputDropdownComponent,
    TranslateModule,
    AddSubfieldDialogComponent,
    InputAutocompleteComponent,
  ],
  templateUrl: './field-300-editor.component.html',
})
export class Field300EditorComponent {
  private readonly rs = inject(RecordStateService);
  private readonly cps = inject(ContextPanelService);

  private wasEditingThisField = false;

  fieldId = input.required<UUID>();

  readonly addSubfieldDialogOpen = signal(false);
  readonly addSubfieldDialogError = signal<string | null>(null);
  readonly pendingFocusTarget = signal<PendingFocusTarget>(null);

  private readonly allAutocompletes = viewChildren(InputAutocompleteComponent);

  readonly tag = '300';

  readonly indicators = computed(() => getIndicators(this.tag));
  readonly ind1Options = computed(() => this.indicators().ind1);
  readonly ind2Options = computed(() => this.indicators().ind2);

  readonly templateOrder = computed(() => {
    return (
      DATA_FIELD_RULES[this.tag]?.templateOrder ?? ['a', 'b', 'c', 'e', '3']
    );
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
      const repeatable = isSubfieldRepeatable(this.tag, code);
      const matching = subfields
        .map((sf, sourceIndex) => ({ sf, sourceIndex }))
        .filter(({ sf }) => sf.code === code);

      if (repeatable) {
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
      const state = this.cps.state();
      const isEditingThisField =
        state.mode === 'edit' && state.fieldId === this.fieldId();

      if (!isEditingThisField) return;

      queueMicrotask(() => {
        this.allAutocompletes()[0]?.focus();
      });
    });

    effect(() => {
      const target = this.pendingFocusTarget();
      const visible = this.visibleSubfields();
      if (!target || !visible.length) return;

      queueMicrotask(() => {
        const matchingVisibleIndexes = visible
          .map((sf, index) => ({ sf, index }))
          .filter((x) => x.sf.kind === target.kind && x.sf.code === target.code)
          .map((x) => x.index);

        const visibleIndex = matchingVisibleIndexes[target.occurrence - 1];
        if (visibleIndex == null) return;

        this.allAutocompletes()[visibleIndex]?.focus();
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

  onSubfieldValueChange(sf: VisibleSubfield, value: string) {
    if (sf.kind === 'template') {
      this.setTemplateSubValue(sf, value);
      return;
    }

    if (sf.sourceIndex !== null) {
      this.setExtraSubValue(sf.sourceIndex, value);
    }
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

  getSubfieldLabel(code: string): string {
    return getSubfieldRuleLabel(this.tag, code) ?? `|${code}`;
  }
}
