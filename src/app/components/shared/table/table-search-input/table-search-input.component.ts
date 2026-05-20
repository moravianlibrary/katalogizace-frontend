import { Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { IconComponent } from '../../../shared/icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-table-search-input',
  imports: [TranslateModule, IconComponent],
  templateUrl: './table-search-input.component.html',
})
export class TableSearchInputComponent {
  value = input('');
  placeholderKey = input.required<string>();

  valueChange = output<string>();

  protected onInput(event: Event) {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
