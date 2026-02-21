import { UUID } from '@/app/models';
import { RecordStateService } from '@/app/services/record-state.service';
import { Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-generic-control-field-editor',
  imports: [TranslateModule],
  templateUrl: './generic-control-field-editor.component.html',
})
export class GenericControlFieldEditorComponent {
  private readonly rs = inject(RecordStateService);

  fieldId = input.required<UUID>();

  readonly field = computed(() => {
    const rec = this.rs.editableRecord();
    if (!rec) return null;
    return rec.control_fields.find((f) => f.fieldId === this.fieldId()) ?? null;
  });

  setValue(value: string) {
    this.rs.patchControlField(this.fieldId(), { value });
  }
}
