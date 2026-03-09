import { UUID } from '@/app/models';
import { RecordStateService } from '@/app/services/record-state.service';
import { Component, inject, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'tr[appMarcRowControl]',
  templateUrl: './marc-row-control.component.html',
})
export class MarcRowControlComponent {
  private recordState = inject(RecordStateService);

  rowClass = input<string>('');

  cf = input.required<{ tag: string; value: string; fieldId?: UUID }>();
  editable = input<boolean>(true);

  onDeleteField() {
    this.recordState.removeField(this.cf().fieldId!);
  }
}
