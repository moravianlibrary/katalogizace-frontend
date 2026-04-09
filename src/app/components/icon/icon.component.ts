import { AppIconName } from '@/app/models/shared/icon.model';
import { Component, computed, input } from '@angular/core';
import { ICONS } from './icons.registry';

@Component({
  standalone: true,
  selector: 'svg[appIcon]',
  templateUrl: './icon.component.html',
  host: {
    xmlns: 'http://www.w3.org/2000/svg',
    '[attr.viewBox]': 'icon().viewBox',
  },
})
export class IconComponent {
  name = input.required<AppIconName>({ alias: 'appIcon' });

  icon = computed(() => ICONS[this.name()]);
}
