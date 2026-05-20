import { Injectable, signal } from '@angular/core';

export type ConfirmDialogKind = 'primary' | 'error';

export type ConfirmDialogOptions = {
  title: string;
  note?: string | null;
  confirmLabel: string;
  confirmKind?: ConfirmDialogKind;
};

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly open = signal(false);

  readonly title = signal('');
  readonly note = signal<string | null>(null);
  readonly confirmLabel = signal('');
  readonly confirmKind = signal<ConfirmDialogKind>('primary');

  private resolver: ((confirmed: boolean) => void) | null = null;

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    this.close(false);

    this.title.set(options.title);
    this.note.set(options.note ?? null);
    this.confirmLabel.set(options.confirmLabel);
    this.confirmKind.set(options.confirmKind ?? 'primary');

    this.open.set(true);

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  cancel() {
    this.close(false);
  }

  accept() {
    this.close(true);
  }

  private close(confirmed: boolean) {
    if (!this.open() && !this.resolver) return;

    this.open.set(false);

    const resolver = this.resolver;
    this.resolver = null;

    resolver?.(confirmed);
  }
}
