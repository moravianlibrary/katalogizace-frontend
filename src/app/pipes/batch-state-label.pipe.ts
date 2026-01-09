import { BATCH_STATE_LABELS, BatchState } from '@/app/models';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'batchStateLabel',
  standalone: true,
})
export class BatchStateLabelPipe implements PipeTransform {
  transform(value: BatchState | null): string {
    if (!value) return '—';

    return BATCH_STATE_LABELS[value] ?? value;
  }
}
