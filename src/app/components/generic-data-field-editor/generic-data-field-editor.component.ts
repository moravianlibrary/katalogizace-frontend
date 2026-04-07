import {
  AddSubfieldDialogComponent,
  AddSubfieldDialogResult,
} from '@/app/components/add-subfield-dialog/add-subfield-dialog.component';
import {
  getSubfieldRuleLabel,
  INDICATOR_OPTIONS,
  MarcSubfield,
  UUID,
} from '@/app/models';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { bindAddSubfieldShortcut } from '@/app/utils/bind-add-subfield-shortcut';
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
import { InputAutocompleteComponent } from '../inputs/input-autocomplete/input-autocomplete.component';
import { InputDropdownComponent } from '../inputs/input-dropdown/input-dropdown.component';

type PendingFocusTarget = {
  code: string;
  occurrence: number;
} | null;

@Component({
  standalone: true,
  selector: 'app-generic-data-field-editor',
  imports: [
    CommonModule,
    TranslateModule,
    InputDropdownComponent,
    AddSubfieldDialogComponent,
    InputAutocompleteComponent,
  ],
  templateUrl: './generic-data-field-editor.component.html',
})
export class GenericDataFieldEditorComponent {
  private readonly rs = inject(RecordStateService);
  private readonly cps = inject(ContextPanelService);

  private wasEditingThisField = false;

  fieldId = input.required<UUID>();

  INDICATOR_OPTIONS = INDICATOR_OPTIONS;

  readonly addSubfieldDialogOpen = signal(false);
  readonly addSubfieldDialogError = signal<string | null>(null);
  readonly pendingFocusTarget = signal<PendingFocusTarget>(null);

  private readonly autocompleteInputs = viewChildren(
    InputAutocompleteComponent,
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
      const id = this.fieldId();
      if (!id) return;

      queueMicrotask(() => {
        this.autocompleteInputs()[0]?.focus();
      });
    });

    effect(() => {
      const target = this.pendingFocusTarget();
      const subfields = this.field()?.subfields ?? [];
      if (!target || !subfields.length) return;

      queueMicrotask(() => {
        let occurrence = 0;

        const index = subfields.findIndex((sf) => {
          if (sf.code !== target.code) return false;

          occurrence++;
          return occurrence === target.occurrence;
        });

        if (index === -1) return;

        this.autocompleteInputs()[index]?.focus();
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

  readonly field = computed(() => {
    const rec = this.rs.editableRecord();
    if (!rec) return null;
    return rec.data_fields.find((f) => f.fieldId === this.fieldId()) ?? null;
  });

  private cleanupEmptySubfields() {
    const field = this.field();
    if (!field) return;

    const current = field.subfields ?? [];
    const cleaned = current.filter(
      (sf) =>
        (sf.code ?? '').trim().length > 0 && (sf.value ?? '').trim().length > 0,
    );

    if (cleaned.length === current.length) return;

    this.rs.patchDataField(this.fieldId(), { subfields: cleaned });
  }

  setInd(ind: 1 | 2, raw: string) {
    const v = (raw ?? '').slice(0, 1);
    if (ind === 1) {
      this.rs.patchDataField(this.fieldId(), { ind1: v });
    } else {
      this.rs.patchDataField(this.fieldId(), { ind2: v });
    }
  }

  setSubfieldValue(subfieldIndex: number, value: string) {
    this.rs.patchSubfield(this.fieldId(), subfieldIndex, { value });
  }

  deleteSubfield(subfieldIndex: number) {
    this.rs.removeSubfield(this.fieldId(), subfieldIndex);
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
    const firstAddedCode = result.subfieldCodes[0] ?? null;

    const added: MarcSubfield[] = result.subfieldCodes.map((code) => ({
      code,
      value: '',
    }));

    this.rs.patchDataField(this.fieldId(), {
      subfields: [...existingSubfields, ...added],
    });

    if (firstAddedCode) {
      const occurrence =
        existingSubfields.filter((sf) => sf.code === firstAddedCode).length + 1;

      this.pendingFocusTarget.set({
        code: firstAddedCode,
        occurrence,
      });
    } else {
      this.pendingFocusTarget.set(null);
    }

    this.addSubfieldDialogOpen.set(false);
    this.addSubfieldDialogError.set(null);
  }

  getSubfieldLabel(code: string): string {
    return getSubfieldRuleLabel(this.field()?.tag!, code) ?? `|${code}`;
  }
}
