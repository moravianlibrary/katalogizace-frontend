import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-dialog-shell',
  imports: [NgClass, IconComponent],
  templateUrl: './dialog-shell.component.html',
})
export class DialogShellComponent {
  open = input<boolean>(false);
  title = input<string>('');
  titleId = input<string>('dialog-title');
  overlayClass = input<string>('z-100');
  panelClass = input<string>('w-[calc(100vw-2rem)] max-w-xl');
  closeDisabled = input<boolean>(false);

  readonly backdropClick = output<void>();
  readonly closeRequested = output<void>();
  readonly escapePressed = output<void>();
  readonly panelClick = output<void>();

  onPanelClick(event: MouseEvent) {
    event.stopPropagation();
    this.panelClick.emit();
  }
}
