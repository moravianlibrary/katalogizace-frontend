import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TableSortDirection } from '../../../utils/table-query-state.util';
import { IconComponent } from '../../icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-sortable-table-header',
  imports: [NgClass, TranslateModule, IconComponent],
  templateUrl: './sortable-table-header.component.html',
})
export class SortableTableHeaderComponent {
  active = input(false);
  direction = input<TableSortDirection>('desc');
  labelKey = input.required<string>();

  sort = output<void>();

  protected onSort() {
    this.sort.emit();
  }
}
