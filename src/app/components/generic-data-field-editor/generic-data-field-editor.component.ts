import { UUID } from '@/app/models';
import { RecordStateService } from '@/app/services/record-state.service';
import { Component, computed, inject, input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  DropdownOption,
  InputDropdownComponent,
} from '../input-dropdown/input-dropdown.component';

@Component({
  standalone: true,
  selector: 'app-generic-data-field-editor',
  imports: [TranslateModule, InputDropdownComponent],
  templateUrl: './generic-data-field-editor.component.html',
})
export class GenericDataFieldEditorComponent {
  private readonly rs = inject(RecordStateService);
  private translate = inject(TranslateService);

  fieldId = input.required<UUID>();

  readonly INDICATOR_OPTIONS: DropdownOption[] = [
    {
      value: '',
      label: this.translate.instant('field_edit.undefined_indicator'),
    },
    { value: '0', label: '0' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
    { value: '7', label: '7' },
    { value: '8', label: '8' },
    { value: '9', label: '9' },
  ];

  readonly field = computed(() => {
    const rec = this.rs.editableRecord();
    if (!rec) return null;
    return rec.data_fields.find((f) => f.fieldId === this.fieldId()) ?? null;
  });

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
}
