import { RecordStateService } from '@/app/services/record-state.service';
import { Component, computed, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GenericControlFieldEditorComponent } from '../../generic-control-field-editor/generic-control-field-editor.component';
import { GenericDataFieldEditorComponent } from '../../generic-data-field-editor/generic-data-field-editor.component';
import { Field245EditorComponent } from './field-245-editor/field-245-editor.component';
import { Field264EditorComponent } from './field-264-editor/field-264-editor.component';
import { Field500EditorComponent } from './field-500-editor/field-500-editor.component';

@Component({
  standalone: true,
  selector: 'app-context-edit',
  imports: [
    GenericControlFieldEditorComponent,
    GenericDataFieldEditorComponent,
    TranslateModule,
    Field264EditorComponent,
    Field245EditorComponent,
    Field500EditorComponent,
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

  is245 = computed(() => this.selected()?.tag === '245');
  is264 = computed(() => this.selected()?.tag === '264');
  is500 = computed(() => this.selected()?.tag === '500');
}
