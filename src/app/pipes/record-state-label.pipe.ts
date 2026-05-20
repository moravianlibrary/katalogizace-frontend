import { RecordState } from '@/app/models';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'recordStateLabel',
  standalone: true,
})
export class RecordStateLabelPipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(value: RecordState | null): string {
    if (!value) return '—';

    return this.translate.instant(`labels.recordState.${value}`);
  }
}
