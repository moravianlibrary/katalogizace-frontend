import { Component, OnDestroy, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../../../shared/icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-export-marcxml-dialog',
  imports: [TranslateModule, IconComponent],
  templateUrl: './export-marcxml-dialog.component.html',
})
export class ExportMarcxmlDialogComponent implements OnDestroy {
  open = input<boolean>(false);
  marcxml = input<string>('');
  filename = input<string>('marc-record.xml');

  closed = output<void>();

  readonly copied = signal(false);

  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  close() {
    this.clearCopiedState();
    this.closed.emit();
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.marcxml());

      this.copied.set(true);

      if (this.copiedTimeout) {
        clearTimeout(this.copiedTimeout);
      }

      this.copiedTimeout = setTimeout(() => {
        this.copied.set(false);
        this.copiedTimeout = null;
      }, 5000);
    } catch {
      this.clearCopiedState();
    }
  }

  save() {
    const xml = this.marcxml();
    if (!xml) return;

    const blob = new Blob([xml], {
      type: 'application/xml;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = this.filename();
    a.click();

    URL.revokeObjectURL(url);
  }

  ngOnDestroy() {
    this.clearCopiedState();
  }

  private clearCopiedState() {
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
      this.copiedTimeout = null;
    }

    this.copied.set(false);
  }
}
