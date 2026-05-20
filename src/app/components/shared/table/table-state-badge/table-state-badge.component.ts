import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';

import { AppIconName } from '@/app/models/shared/icon.model';
import { IconComponent } from '../../../shared/icon/icon.component';

export type TableStateBadgeAppearance = Readonly<{
  containerClass: string;
  iconClass?: string | null;
  iconName?: AppIconName | null;
}>;

@Component({
  standalone: true,
  selector: 'app-table-state-badge',
  imports: [NgClass, IconComponent],
  templateUrl: './table-state-badge.component.html',
})
export class TableStateBadgeComponent {
  appearance = input.required<TableStateBadgeAppearance>();
  label = input.required<string>();
}
