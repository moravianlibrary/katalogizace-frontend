import { ProcessState } from '@/app/models';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'processStateLabel',
  standalone: true,
})
export class ProcessStateLabelPipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(value: ProcessState | null): string {
    if (!value) return '—';

    return this.translate.instant(`labels.processState.${value}`);
  }
}
