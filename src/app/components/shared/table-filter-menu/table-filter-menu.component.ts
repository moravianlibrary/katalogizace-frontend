import { NgClass } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { IconComponent } from '../../icon/icon.component';

export type TableFilterOption = Readonly<{
  value: string | null;
  labelKey: string;
}>;

@Component({
  standalone: true,
  selector: 'app-table-filter-menu',
  imports: [NgClass, TranslateModule, IconComponent],
  templateUrl: './table-filter-menu.component.html',
})
export class TableFilterMenuComponent {
  labelKey = input.required<string>();
  options = input<readonly TableFilterOption[]>([]);
  value = input<string | null>(null);
  radioName = input.required<string>();
  panelWidthClass = input('w-54');

  valueChange = output<string | null>();

  protected readonly open = signal(false);
  protected readonly position = signal<{ top: number; left: number } | null>(
    null,
  );
  protected readonly active = computed(() => this.value() !== null);

  protected toggle(event: MouseEvent) {
    event.stopPropagation();

    if (this.open()) {
      this.close();
      return;
    }

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    this.position.set({
      top: rect.bottom + 8,
      left: rect.left,
    });

    this.open.set(true);
  }

  protected close() {
    this.open.set(false);
    this.position.set(null);
  }

  protected select(value: string | null) {
    this.valueChange.emit(value);
    this.close();
  }
}
