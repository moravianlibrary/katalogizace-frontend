import { AppIconName } from '@/app/models/shared/icon.model';
import { Component, computed, input } from '@angular/core';
import { ICONS } from './icons.registry';

@Component({
  standalone: true,
  selector: 'app-icon',
  templateUrl: './icon.component.html',
})
export class IconComponent {
  name = input.required<AppIconName>();
  className = input.required<string>();
  width = input.required<string>();
  height = input.required<string>();

  icon = computed(() => ICONS[this.name()]);
}
