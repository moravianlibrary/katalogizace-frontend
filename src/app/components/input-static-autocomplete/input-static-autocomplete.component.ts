import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

export type TranslateDropdownItem = {
  code: string;
  translatedLabel?: string;
  iconLeft?: string;
  translate?: boolean;
};

@Component({
  standalone: true,
  selector: 'app-input-static-autocomplete',
  imports: [CommonModule],
  templateUrl: './input-static-autocomplete.component.html',
})
export class InputStaticAutocompleteComponent {
  value = input<string>('');
  valueChange = output<string>();

  items = input<TranslateDropdownItem[]>([]);
  placeholder = input<string>('');
  disabled = input<boolean>(false);

  minlength = input<number>(0);
  maxlength = input<number | null>(null);
  limit = input<number>(50);

  readonly focused = signal(false);
  readonly query = signal('');

  readonly hideDropdown = signal(false);

  private blurTimer: number | null = null;

  constructor() {
    effect(() => {
      const v = this.value() ?? '';
      if (!this.focused()) this.query.set(v);
    });
  }

  readonly filtered = computed(() => {
    const all = this.items() ?? [];
    const q = (this.query() ?? '').toLowerCase().trim();

    if (q.length < this.minlength()) return [];

    if (!q.length) return all.slice(0, this.limit());

    const res = all.filter((it) => {
      const code = (it.code ?? '').toLowerCase();
      const label = (it.translatedLabel ?? '').toLowerCase();
      return code.includes(q) || label.includes(q);
    });

    return res.slice(0, this.limit());
  });

  readonly open = computed(() => {
    if (!this.focused()) return false;
    if (this.disabled()) return false;
    if (this.hideDropdown()) return false;
    return this.filtered().length > 0;
  });

  onFocus() {
    if (this.blurTimer) {
      window.clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
    this.focused.set(true);
  }

  onBlur() {
    if (this.blurTimer) window.clearTimeout(this.blurTimer);

    this.blurTimer = window.setTimeout(() => {
      this.focused.set(false);
      this.hideDropdown.set(false);
      this.blurTimer = null;
    }, 120);
  }

  onInput(v: string) {
    if (!this.focused()) this.focused.set(true);

    if (this.hideDropdown()) this.hideDropdown.set(false);

    const max = this.maxlength();
    const next = max != null ? (v ?? '').slice(0, max) : (v ?? '');

    this.query.set(next);
    this.valueChange.emit(next);
  }

  clear() {
    if (this.blurTimer) {
      window.clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
    this.focused.set(true);
    this.hideDropdown.set(false);

    this.query.set('');
    this.valueChange.emit('');
  }

  pick(code: string) {
    if (this.blurTimer) {
      window.clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
    this.focused.set(true);

    this.query.set(code);
    this.valueChange.emit(code);

    this.hideDropdown.set(true);
  }

  isSelected(code: string): boolean {
    return (this.value() ?? '') === code;
  }
}
