import { UUID } from '@/app/models';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { FieldEditService } from '@/app/services/edit.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { Component, inject, input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../icon/icon.component';

@Component({
  standalone: true,
  selector: 'tr[appMarcRowControl]',
  templateUrl: './marc-row-control.component.html',
  imports: [IconComponent],
})
export class MarcRowControlComponent {
  private recordState = inject(RecordStateService);
  private translate = inject(TranslateService);
  private edit = inject(FieldEditService);
  private cps = inject(ContextPanelService);

  rowClass = input<string>('');

  cf = input.required<{ tag: string; value: string; fieldId?: UUID }>();
  editable = input<boolean>(false);

  onDeleteField(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    const confirmed = confirm(
      this.translate.instant('messages.confirm.records.delete'),
    );
    if (!confirmed) return;

    this.recordState.removeField(this.cf().fieldId!);
    this.edit.field.set(null);
    this.cps.setMode('records');
  }

  onTakeField() {
    this.recordState.takeControlField({
      tag: this.cf().tag,
      value: this.cf().value ?? '',
    });
  }
}
