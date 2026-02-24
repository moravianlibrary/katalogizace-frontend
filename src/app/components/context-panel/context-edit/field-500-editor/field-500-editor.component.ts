import { TextareaAutocompleteComponent } from '@/app/components/textarea-autocomplete/textarea-autocomplete.component';
import { UUID } from '@/app/models';
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

@Component({
  standalone: true,
  selector: 'app-field-500-editor',
  imports: [TextareaAutocompleteComponent, TranslateModule],
  templateUrl: './field-500-editor.component.html',
})
export class Field500EditorComponent {
  private readonly rs = inject(RecordStateService);

  fieldId = input.required<UUID>();

  private readonly firstTextarea = viewChild(TextareaAutocompleteComponent);

  constructor() {
    effect(() => {
      this.fieldId();
      queueMicrotask(() => this.firstTextarea()?.focus());
    });
  }

  readonly field = computed(() => {
    const rec = this.rs.editableRecord();
    if (!rec) return null;
    return rec.data_fields.find((f) => f.fieldId === this.fieldId()) ?? null;
  });

  getA(): string {
    const f = this.field();
    if (!f) return '';
    return f.subfields?.find((s) => s.code === 'a')?.value ?? '';
  }

  setA(value: string) {
    const f = this.field();
    if (!f) return;

    const subfields = [...(f.subfields ?? [])];
    const idx = subfields.findIndex((s) => s.code === 'a');

    if (idx >= 0) subfields[idx] = { ...subfields[idx], value };
    else subfields.push({ code: 'a', value });

    this.rs.patchDataField(this.fieldId(), { subfields });
  }
}
