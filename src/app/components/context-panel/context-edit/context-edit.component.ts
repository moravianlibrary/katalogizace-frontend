import { ContextPanelService } from '@/app/services/context-panel.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { Component, computed, effect, inject, untracked } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GenericControlFieldEditorComponent } from '../../generic-control-field-editor/generic-control-field-editor.component';
import { GenericDataFieldEditorComponent } from '../../generic-data-field-editor/generic-data-field-editor.component';
import { Field008EditorComponent } from './field-008-editor/field-008-editor.component';
import { Field245EditorComponent } from './field-245-editor/field-245-editor.component';
import { Field264EditorComponent } from './field-264-editor/field-264-editor.component';
import { Field500EditorComponent } from './field-500-editor/field-500-editor.component';
import { Field65xEditorComponent } from './field-65x-editor/field-65x-editor.component';

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
    Field008EditorComponent,
    Field65xEditorComponent,
  ],
  templateUrl: './context-edit.component.html',
})
export class ContextEditComponent {
  private readonly rs = inject(RecordStateService);
  private readonly cps = inject(ContextPanelService);

  readonly selected = computed(() => this.rs.selectedField());

  constructor() {
    effect(() => {
      this.cps.editResetNonce();
      const snap = this.cps.editSnapshot();
      if (!snap) return;

      untracked(() => {
        if (snap.kind === 'control') {
          this.rs.applyEditSnapshot({
            kind: 'control',
            tag: snap.tag,
            fieldId: snap.fieldId,
            value: snap.value,
          });
        } else {
          this.rs.applyEditSnapshot({
            kind: 'data',
            tag: snap.tag,
            fieldId: snap.fieldId,
            ind1: snap.ind1,
            ind2: snap.ind2,
            subfields: snap.subfields,
          });
        }
      });
    });
  }

  readonly isControl = computed(() => {
    const f = this.selected();
    return f ? this.rs.isControlTag(f.tag) : false;
  });

  is008 = computed(() => this.selected()?.tag === '008');
  is245 = computed(() => this.selected()?.tag === '245');
  is264 = computed(() => this.selected()?.tag === '264');
  is500 = computed(() => this.selected()?.tag === '500');
  is650 = computed(() => this.selected()?.tag === '650');
  is651 = computed(() => this.selected()?.tag === '651');
  is655 = computed(() => this.selected()?.tag === '655');
}
