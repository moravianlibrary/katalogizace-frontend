import { ConfirmDialogService } from '@/app/services/confirm-dialog.service';
import { NgClass } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../../../shared/icon/icon.component';

export type ConfirmDialogKind = 'primary' | 'error';

@Component({
  standalone: true,
  selector: 'app-confirm-dialog',
  imports: [NgClass, IconComponent, TranslateModule],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  readonly confirmDialog = inject(ConfirmDialogService);

  readonly confirmButtonClass = computed(() =>
    this.confirmDialog.confirmKind() === 'error'
      ? 'btn-error-full'
      : 'btn-primary',
  );
}
