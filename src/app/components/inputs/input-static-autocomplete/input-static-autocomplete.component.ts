import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
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
  readonly hasEditedSinceFocus = signal(false);

  private blurTimer: number | null = null;

  readonly activeIndex = signal<number>(-1);
  private readonly listRef = viewChild<ElementRef<HTMLDivElement>>('list');

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
    if (!this.hasEditedSinceFocus()) return false;

    const has = this.filtered().length > 0;
    if (has && this.activeIndex() === -1) {
      queueMicrotask(() => this.activeIndex.set(0));
    }
    return has;
  });

  constructor() {
    effect(() => {
      const v = this.value() ?? '';
      if (!this.focused()) this.query.set(v);
    });
  }

  private setActive(i: number) {
    this.activeIndex.set(i);
    this.scrollActiveIntoView();
  }

  private scrollActiveIntoView() {
    queueMicrotask(() => {
      const listEl = this.listRef()?.nativeElement;
      if (!listEl) return;

      const idx = this.activeIndex();
      const item = listEl.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
      item?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    });
  }

  private resetActive() {
    this.activeIndex.set(-1);
  }

  onFocus() {
    if (this.blurTimer) {
      window.clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }

    this.focused.set(true);
    this.hasEditedSinceFocus.set(false);
    this.resetActive();
  }

  onBlur() {
    if (this.blurTimer) window.clearTimeout(this.blurTimer);

    this.blurTimer = window.setTimeout(() => {
      this.focused.set(false);
      this.hideDropdown.set(false);
      this.hasEditedSinceFocus.set(false);
      this.resetActive();
      this.blurTimer = null;
    }, 120);
  }

  onInput(v: string) {
    if (!this.focused()) this.focused.set(true);

    if (this.hideDropdown()) this.hideDropdown.set(false);

    const max = this.maxlength();
    const next = max != null ? (v ?? '').slice(0, max) : (v ?? '');

    this.hasEditedSinceFocus.set(true);
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
    this.hasEditedSinceFocus.set(true);
    this.resetActive();

    this.query.set('');
    this.valueChange.emit('');
  }

  pick(code: string) {
    if (this.blurTimer) {
      window.clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }

    this.focused.set(true);
    this.hasEditedSinceFocus.set(false);

    this.query.set(code);
    this.valueChange.emit(code);

    this.hideDropdown.set(true);
    this.resetActive();
  }

  onKeydown(e: KeyboardEvent) {
    if (this.disabled()) return;

    const list = this.filtered();
    const hasList = list.length > 0;
    const idx = this.activeIndex();

    if (e.key === 'ArrowDown') {
      e.preventDefault();

      if (this.hideDropdown()) this.hideDropdown.set(false);

      if (!this.hasEditedSinceFocus()) return;
      if (!hasList) return;

      const next = Math.min(idx < 0 ? 0 : idx + 1, list.length - 1);
      this.setActive(next);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();

      if (!this.hasEditedSinceFocus()) return;
      if (!hasList) return;

      const next = Math.max(idx <= 0 ? 0 : idx - 1, 0);
      this.setActive(next);
      return;
    }

    if (e.key === 'Enter') {
      if (!this.hasEditedSinceFocus()) return;
      if (!hasList) return;
      if (idx < 0) return;

      e.preventDefault();
      const it = list[idx];
      if (it) this.pick(it.code);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.hideDropdown.set(true);
      this.resetActive();
      return;
    }
  }
}
