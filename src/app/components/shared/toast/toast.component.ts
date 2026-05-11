import { ToastKind } from '@/app/models';
import { AppIconName } from '@/app/models/shared/icon.model';
import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ToastService } from '../../../services/toast.service';
import { IconComponent } from '../icon/icon.component';

type ToastUiConfig = {
  containerClass: string;
  iconClass: string;
  icon: AppIconName;
};

const TOAST_UI: Record<ToastKind, ToastUiConfig> = {
  error: {
    containerClass: 'bg-[#ffd5d3]',
    iconClass: 'icon-error',
    icon: 'danger',
  },
  warning: {
    containerClass: 'bg-[#fff4e5]',
    iconClass: 'icon-warning',
    icon: 'warningCircle',
  },
  success: {
    containerClass: 'bg-[#eaf9ee]',
    iconClass: 'icon-success',
    icon: 'checkCircleEmpty',
  },
  info: {
    containerClass: 'bg-[e5f1ff]',
    iconClass: 'fill-blue-500',
    icon: 'info',
  },
};

@Component({
  standalone: true,
  selector: 'app-toast',
  imports: [CommonModule, IconComponent],
  templateUrl: './toast.component.html',
})
export class ToastComponent {
  readonly toast = inject(ToastService);

  readonly ui = computed(() => TOAST_UI[this.toast.kind()]);
}
