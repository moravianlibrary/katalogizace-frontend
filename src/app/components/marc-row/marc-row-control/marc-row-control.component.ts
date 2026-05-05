import { UUID } from '@/app/models';
import { ConfirmDialogService } from '@/app/services/confirm-dialog.service';
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
  private confirmDialog = inject(ConfirmDialogService);

  rowClass = input<string>('');

  cf = input.required<{ tag: string; value: string; fieldId?: UUID }>();
  editable = input<boolean>(false);
  takeable = input<boolean>(false);

  async onDeleteField(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    const confirmed = await this.confirmDialog.confirm({
      title: this.translate.instant('messages.confirm.records.delete_title'),
      confirmLabel: this.translate.instant('buttons.delete_permanently'),
      confirmKind: 'error',
    });

    if (!confirmed) return;

    this.recordState.removeField(this.cf().fieldId!);
    this.edit.field.set(null);
    this.cps.setMode('records');
  }

  onTakeField() {
    if (!this.takeable()) return;

    this.recordState.takeControlField({
      tag: this.cf().tag,
      value: this.cf().value ?? '',
    });
  }
}
