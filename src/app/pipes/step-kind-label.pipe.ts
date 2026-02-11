import { StepKind } from '@/app/models';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'stepKindLabel',
  standalone: true,
})
export class StepKindLabelPipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(value: StepKind): string {
    if (!value) return '';
    return this.translate.instant(`labels.stepKind.${value}`);
  }
}
