import { Pipe, PipeTransform } from '@angular/core';
import { RECORD_STATE_LABELS, RecordState } from '../models/book';

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
