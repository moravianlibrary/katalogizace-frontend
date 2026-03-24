import {
  FieldType,
  getSubfields,
  ID,
  isFieldRepeatable,
  isSubfieldRepeatable,
  MarcSubfield,
} from '@/app/models';
import { Component, effect, inject, input, signal } from '@angular/core';
import { MarcDiffService } from '../../services/marc-diff.service';
import { RecordStateService } from '../../services/record-state.service';
import { RecordStore } from '../../stores/record.store';
import { ExtractedFieldsComponent } from '../extracted-fields/extracted-fields/extracted-fields.component';

import { QuickAddItem } from '@/app/models/shared/record-state';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { compareSubfieldCodes } from '@/app/utils/marc-subfield-sort';
import {
  existingToEditableWithMeta,
  extractedToEditableWithMeta,
} from '@/app/utils/marc-transform';
import { TranslateModule } from '@ngx-translate/core';
import {
  AddFieldDialogComponent,
  AddFieldDialogResult,
} from '../add-field-dialog/add-field-dialog.component';
import { EditableMarcRecordTableComponent } from '../marc-record-table/editable-marc-record-table/editable-marc-record-table.component';
import { MainPanelHeaderComponent } from './main-panel-header/main-panel-header.component';

@Component({
  standalone: true,
  selector: 'app-main-panel',
  imports: [
    MainPanelHeaderComponent,
    ExtractedFieldsComponent,
    EditableMarcRecordTableComponent,
    TranslateModule,
    AddFieldDialogComponent,
  ],
  templateUrl: './main-panel.component.html',
})
export class MainPanelComponent {
  book_id = input<ID | null>(null);

  recordState = inject(RecordStateService);
  store = inject(RecordStore);
  diff = inject(MarcDiffService);
  cps = inject(ContextPanelService);

  viewMode = this.recordState.viewMode;
  recordPreview = this.recordState.recordPreview;

  diffIndex = this.diff.diffIndex;

  readonly addFieldDialogOpen = signal(false);
  readonly addFieldDialogError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const e = this.store.extracted();
      const l = this.store.lastEdited();

      const editable = l
        ? existingToEditableWithMeta(l)
        : extractedToEditableWithMeta(e);

      this.recordState.setEditableRecord(editable);
    });
  }

  onQuickAdd(it: QuickAddItem) {
    if (it.action === 'add-field') {
      this.addField();
      return;
    }

    if (
      it.tag == null ||
      it.type == null ||
      it.subfields == null ||
      it.ind1 == null ||
      it.ind2 == null
    ) {
      return;
    }

    this.recordState.addFieldWithTag(
      it.tag,
      it.type,
      it.subfields,
      it.ind1,
      it.ind2,
    );

    const selected = this.recordState.selectedFieldId();
    if (!selected) return;

    this.enterSelectedFieldEdit();
  }

  private enterSelectedFieldEdit() {
    const field = this.recordState.selectedField();
    if (!field) return;

    if ('value' in field) {
      this.cps.enterEdit({
        kind: 'control',
        fieldId: field.fieldId,
        tag: field.tag,
        value: field.value ?? '',
      });
      return;
    }

    this.cps.enterEdit({
      kind: 'data',
      fieldId: field.fieldId,
      tag: field.tag,
      ind1: field.ind1 ?? '',
      ind2: field.ind2 ?? '',
      subfields: (field.subfields ?? []).map((sf) => ({ ...sf })),
    });
  }

  addField() {
    this.addFieldDialogError.set(null);
    this.addFieldDialogOpen.set(true);
  }

  closeAddFieldDialog() {
    this.addFieldDialogOpen.set(false);
    this.addFieldDialogError.set(null);
  }

  onAddFieldConfirm(result: AddFieldDialogResult) {
    const paddedTag = result.tag.padStart(3, '0');
    const normalizedTag = Number(paddedTag);
    const fieldType = this.resolveFieldType(paddedTag);

    const alreadyExists = this.recordState
      .uiFields()
      .some((f) => f.tag === paddedTag);

    if (!(isFieldRepeatable(paddedTag) ?? true) && alreadyExists) {
      this.addFieldDialogError.set('field_add.non_repeatable_error');
      return;
    }

    const codes =
      fieldType === 'data'
        ? this.buildSubfieldCodes(paddedTag, result.subfieldCodes)
        : [];

    const subfields: MarcSubfield[] =
      fieldType === 'data'
        ? codes.map((code) => ({
            code,
            value: '',
          }))
        : [];

    this.recordState.addFieldWithTag(
      normalizedTag,
      fieldType,
      subfields,
      '',
      '',
    );

    this.addFieldDialogError.set(null);
    this.addFieldDialogOpen.set(false);

    const selected = this.recordState.selectedFieldId();
    if (!selected) return;

    this.enterSelectedFieldEdit();
  }

  private resolveFieldType(tag: string): FieldType {
    return tag.startsWith('00') ? 'control' : 'data';
  }

  private buildSubfieldCodes(tag: string, userCodes: string[]): string[] {
    const templateCodes = Object.keys(getSubfields(tag) ?? {});

    const result: string[] = [...templateCodes];

    for (const code of userCodes) {
      if (isSubfieldRepeatable(tag, code) ?? true) {
        result.push(code);
        continue;
      }

      if (!result.includes(code)) {
        result.push(code);
      }
    }

    const fallback = result.length ? result : ['a'];

    return fallback.sort(compareSubfieldCodes);
  }
}
