import { ToastKind } from '@/app/models';
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<string | null>(null);
  readonly kind = signal<ToastKind>('success');

  show(message: string, kind: ToastKind) {
    this.kind.set(kind);
    this.message.set(message);

    setTimeout(() => this.message.set(null), 3000);
  }
}
