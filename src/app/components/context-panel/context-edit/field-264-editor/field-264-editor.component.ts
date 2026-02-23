import { InputAutocompleteComponent } from '@/app/components/input-autocomplete/input-autocomplete.component';
import { InputDropdownComponent } from '@/app/components/input-dropdown/input-dropdown.component';
import { INDICATOR_OPTIONS, UUID } from '@/app/models';
import { RecordStateService } from '@/app/services/record-state.service';
import { Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-field-264-editor',
  imports: [
    InputDropdownComponent,
    InputAutocompleteComponent,
    TranslateModule,
  ],
  templateUrl: './field-264-editor.component.html',
})
export class Field264EditorComponent {
  private readonly rs = inject(RecordStateService);

  fieldId = input.required<UUID>();

  readonly INDICATOR_OPTIONS = INDICATOR_OPTIONS;

  readonly field = computed(() => {
    const rec = this.rs.editableRecord();
    if (!rec) return null;
    return rec.data_fields.find((f) => f.fieldId === this.fieldId()) ?? null;
  });

  setInd(ind: 1 | 2, value: string) {
    const v = String(value ?? '').slice(0, 1);
    if (ind === 1) this.rs.patchDataField(this.fieldId(), { ind1: v });
    else this.rs.patchDataField(this.fieldId(), { ind2: v });
  }

  getSubfield(code: 'a' | 'b' | 'c'): string {
    const f = this.field();
    if (!f) return '';
    return f.subfields?.find((s) => s.code === code)?.value ?? '';
  }

  setSubfield(code: 'a' | 'b' | 'c', value: string) {
    const f = this.field();
    if (!f) return;

    const subfields = [...(f.subfields ?? [])];
    const idx = subfields.findIndex((s) => s.code === code);

    if (idx >= 0) subfields[idx] = { ...subfields[idx], value };
    else subfields.push({ code, value });

    this.rs.patchDataField(this.fieldId(), { subfields });
  }
}
