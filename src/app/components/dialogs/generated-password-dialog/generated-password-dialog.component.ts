import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-generated-password-dialog',
  imports: [TranslateModule, IconComponent],
  templateUrl: './generated-password-dialog.component.html',
})
export class GeneratedPasswordDialogComponent {
  private destroyRef = inject(DestroyRef);

  open = input<boolean>(false);
  titleKey = input<string>('users.new_password');
  password = input<string>('');

  readonly closed = output<void>();

  readonly locked = signal(false);
  readonly passwordCopied = signal(false);

  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.clearLocalState();
        return;
      }

      this.clearResetPasswordCloseTimer();
      this.clearPasswordCopiedState();

      this.locked.set(true);
      this.closeTimer = setTimeout(() => {
        this.locked.set(false);
        this.closeTimer = null;
      }, 3000);
    });

    this.destroyRef.onDestroy(() => {
      this.clearLocalState();
    });
  }

  requestClose() {
    if (this.locked()) return;

    this.clearLocalState();
    this.closed.emit();
  }

  onEscape() {
    this.requestClose();
  }

  async copyPassword() {
    try {
      await navigator.clipboard.writeText(this.password());

      this.passwordCopied.set(true);

      if (this.copiedTimeout) {
        clearTimeout(this.copiedTimeout);
      }

      this.copiedTimeout = setTimeout(() => {
        this.passwordCopied.set(false);
        this.copiedTimeout = null;
      }, 5000);
    } catch {
      this.clearPasswordCopiedState();
    }
  }

  private clearLocalState() {
    this.clearPasswordCopiedState();
    this.clearResetPasswordCloseTimer();
  }

  private clearPasswordCopiedState() {
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
      this.copiedTimeout = null;
    }

    this.passwordCopied.set(false);
  }

  private clearResetPasswordCloseTimer() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }

    this.locked.set(false);
  }
}
