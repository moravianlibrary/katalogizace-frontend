import { UUID } from '@/app/models';
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
import { IconComponent } from '../shared/icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-generic-control-field-editor',
  imports: [TranslateModule, IconComponent],
  templateUrl: './generic-control-field-editor.component.html',
})
export class GenericControlFieldEditorComponent {
  private readonly rs = inject(RecordStateService);

  fieldId = input.required<UUID>();

  private readonly firstInput = viewChild<ElementRef<HTMLInputElement>>('ctrl');

  constructor() {
    effect(() => {
      this.fieldId();

      queueMicrotask(() => {
        const el = this.firstInput()?.nativeElement;
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
    return rec.control_fields.find((f) => f.fieldId === this.fieldId()) ?? null;
  });

  setValue(value: string) {
    this.rs.patchControlField(this.fieldId(), { value });
  }
}
