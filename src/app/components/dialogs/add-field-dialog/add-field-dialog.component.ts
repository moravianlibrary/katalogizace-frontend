import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icon/icon.component';

export type AddFieldDialogResult = {
  tag: string;
  subfieldCodes: string[];
};

@Component({
  standalone: true,
  selector: 'app-add-field-dialog',
  imports: [CommonModule, TranslateModule, IconComponent],
  templateUrl: './add-field-dialog.component.html',
})
export class AddFieldDialogComponent {
  open = input<boolean>(false);
  error = input<string | null>(null);

  closed = output<void>();
  confirmed = output<AddFieldDialogResult>();
  clearedError = output<void>();

  readonly value = signal('');
  readonly touched = signal(false);

  readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('tagInput');

  readonly isValid = () => /^[0-9]{3}[a-z0-9]*$/.test(this.value());

  constructor() {
    effect(() => {
      if (!this.open()) return;

      this.value.set('');
      this.touched.set(false);

      queueMicrotask(() => {
        this.inputRef()?.nativeElement.focus();
        this.inputRef()?.nativeElement.select();
      });
    });
  }

  onInput(value: string) {
    this.value.set(value.trim());
    this.clearedError.emit();
  }

  onSubmit() {
    this.touched.set(true);
    if (!this.isValid()) return;

    const raw = this.value();
    const tag = raw.slice(0, 3);

    const subfieldCodes = raw
      .slice(3)
      .split('')
      .map((x) => x.trim())
      .filter((x) => /^[a-zA-Z0-9]$/.test(x))
      .sort((a, b) => {
        const isALetter = /[a-zA-Z]/.test(a);
        const isBLetter = /[a-zA-Z]/.test(b);

        const isADigit = /\d/.test(a);
        const isBDigit = /\d/.test(b);

        if (isALetter && isBDigit) return -1;
        if (isADigit && isBLetter) return 1;

        if (isALetter && isBLetter) {
          return a.localeCompare(b);
        }

        if (isADigit && isBDigit) {
          return Number(a) - Number(b);
        }

        return a.localeCompare(b);
      });

    this.confirmed.emit({
      tag,
      subfieldCodes,
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closed.emit();
    }
  }

  onBackdropClick() {
    this.closed.emit();
  }

  onDialogClick(event: MouseEvent) {
    event.stopPropagation();
  }
}
