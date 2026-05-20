import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';

import { IconComponent } from '../../../shared/icon/icon.component';

export type TablePaginationItem = number | 'ellipsis-left' | 'ellipsis-right';

@Component({
  standalone: true,
  selector: 'app-table-pagination',
  imports: [NgClass, IconComponent],
  templateUrl: './table-pagination.component.html',
})
export class TablePaginationComponent {
  from = input.required<number>();
  to = input.required<number>();
  total = input.required<number>();
  page = input.required<number>();
  visiblePages = input.required<readonly TablePaginationItem[]>();
  hasPrev = input.required<boolean>();
  hasNext = input.required<boolean>();
  containerClass = input('flex w-full items-center justify-between gap-4');

  pageChange = output<number>();
  prev = output<void>();
  next = output<void>();

  protected goToPage(page: number) {
    this.pageChange.emit(page);
  }

  protected goPrevPage() {
    this.prev.emit();
  }

  protected goNextPage() {
    this.next.emit();
  }
}
