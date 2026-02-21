import { RecordStateService } from '@/app/services/record-state.service';
import { Component, computed, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GenericControlFieldEditorComponent } from '../../generic-control-field-editor/generic-control-field-editor.component';
import { GenericDataFieldEditorComponent } from '../../generic-data-field-editor/generic-data-field-editor.component';

@Component({
  standalone: true,
  selector: 'app-context-edit',
  imports: [
    GenericControlFieldEditorComponent,
    GenericDataFieldEditorComponent,
    TranslateModule,
  ],
  templateUrl: './context-edit.component.html',
})
export class ContextEditComponent {
  private readonly rs = inject(RecordStateService);

  readonly selected = computed(() => this.rs.selectedField());

  readonly isControl = computed(() => {
    const f = this.selected();
    return f ? this.rs.isControlTag(f.tag) : false;
  });
}
