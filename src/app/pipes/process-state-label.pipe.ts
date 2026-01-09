import { PROCESS_STATE_LABELS, ProcessState } from '@/app/models';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'processStateLabel',
  standalone: true,
})
export class ProcessStateLabelPipe implements PipeTransform {
  transform(value: ProcessState | null): string {
    if (!value) return '—';

    return PROCESS_STATE_LABELS[value] ?? value;
  }
}
