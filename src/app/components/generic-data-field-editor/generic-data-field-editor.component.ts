import { INDICATOR_OPTIONS, UUID } from '@/app/models';
import { RecordStateService } from '@/app/services/record-state.service';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { InputDropdownComponent } from '../input-dropdown/input-dropdown.component';

@Component({
  standalone: true,
  selector: 'app-generic-data-field-editor',
  imports: [TranslateModule, InputDropdownComponent],
  templateUrl: './generic-data-field-editor.component.html',
})
export class GenericDataFieldEditorComponent {
  private readonly rs = inject(RecordStateService);

  fieldId = input.required<UUID>();

  INDICATOR_OPTIONS = INDICATOR_OPTIONS;

  private readonly firstSubfieldInput =
    viewChild<ElementRef<HTMLInputElement>>('firstSubfieldInput');

  constructor() {
    effect(() => {
      this.fieldId();

      queueMicrotask(() => {
        const el = this.firstSubfieldInput()?.nativeElement;
        if (!el) return;
        el.focus();
        const len = el.value?.length ?? 0;
        el.setSelectionRange?.(len, len);
      });
    });
  }

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
