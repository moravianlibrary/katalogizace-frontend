import { ToastKind } from '@/app/models';
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<string | null>(null);
  readonly kind = signal<ToastKind>('success');

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  show(message: string, kind: ToastKind) {
    this.kind.set(kind);
    this.message.set(message);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => this.hide(), 4000);
  }

  hide() {
    this.message.set(null);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
