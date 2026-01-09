import { STEP_KIND_LABELS, StepKind } from '@/app/models';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stepKindLabel',
  standalone: true,
})
export class StepKindLabelPipe implements PipeTransform {
  transform(value: StepKind): string {
    if (!value) return '';
    return STEP_KIND_LABELS[value] ?? value;
  }
}
