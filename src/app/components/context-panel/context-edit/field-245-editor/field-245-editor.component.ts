import { InputAutocompleteComponent } from '@/app/components/inputs/input-autocomplete/input-autocomplete.component';
import { InputDropdownComponent } from '@/app/components/inputs/input-dropdown/input-dropdown.component';
import { getIndicators, UUID } from '@/app/models';
import { RecordStateService } from '@/app/services/record-state.service';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

type SfCode245 = 'a' | 'b' | 'n' | 'p' | 'c';

@Component({
  standalone: true,
  selector: 'app-field-245-editor',
  imports: [
    InputDropdownComponent,
    InputAutocompleteComponent,
    TranslateModule,
  ],
  templateUrl: './field-245-editor.component.html',
})
export class Field245EditorComponent {
  private readonly rs = inject(RecordStateService);

  fieldId = input.required<UUID>();

  readonly indicators = computed(() => getIndicators('245'));

  readonly ind1Options = computed(() => this.indicators().ind1);
  readonly ind2Options = computed(() => this.indicators().ind2);

  private readonly firstAutocomplete = viewChild(InputAutocompleteComponent);

  constructor() {
    effect(() => {
      this.fieldId();

      queueMicrotask(() => {
        this.firstAutocomplete()?.focus();
      });
    });
  }

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

  getSubfield(code: SfCode245): string {
    const f = this.field();
    if (!f) return '';
    return f.subfields?.find((s) => s.code === code)?.value ?? '';
  }

  setSubfield(code: SfCode245, value: string) {
    const f = this.field();
    if (!f) return;

    const subfields = [...(f.subfields ?? [])];
    const idx = subfields.findIndex((s) => s.code === code);

    if (idx >= 0) subfields[idx] = { ...subfields[idx], value };
    else subfields.push({ code, value });

    this.rs.patchDataField(this.fieldId(), { subfields });
  }
}
