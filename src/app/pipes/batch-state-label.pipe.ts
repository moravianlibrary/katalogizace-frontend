import { BatchState } from '@/app/models';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'batchStateLabel',
  standalone: true,
})
export class BatchStateLabelPipe implements PipeTransform {
  private translate = inject(TranslateService);
  transform(value: BatchState | null): string {
    if (!value) return '—';

    return this.translate.instant(`labels.batchState.${value}`);
  }
}
