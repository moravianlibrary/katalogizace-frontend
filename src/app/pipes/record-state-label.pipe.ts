import { RECORD_STATE_LABELS, RecordState } from '@/app/models';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'recordStateLabel',
  standalone: true,
})
export class RecordStateLabelPipe implements PipeTransform {
  transform(value: RecordState | null): string {
    if (!value) return '—';

    return RECORD_STATE_LABELS[value] ?? value;
  }
}
