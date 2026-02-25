import { DropdownOption } from '@/app/models/shared/dropdown.model';
import { NgClass } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-input-dropdown',
  imports: [NgClass],
  templateUrl: './input-dropdown.component.html',
})
export class InputDropdownComponent {
  private translate = inject(TranslateService);

  value = input<string>('');
  placeholder = input<string>(
    this.translate.instant('field_edit.undefined_indicator'),
  );
  options = input<DropdownOption[]>([]);
  disabled = input<boolean>(false);

  valueChange = output<string>();

  open = signal(false);

  selectedLabel = computed(() => {
    const v = this.value();
    const opt = this.options().find((o) => o.value === v);
    return opt?.label ?? '';
  });

  readonly activeIndex = signal<number>(-1);

  private readonly listRef = viewChild<ElementRef<HTMLDivElement>>('list');

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
      item?.scrollIntoView?.({
        block: 'nearest',
        behavior: 'smooth',
      });
    });
  }

  private resetActive() {
    this.activeIndex.set(-1);
  }

  private initActive() {
    const opts = this.options() ?? [];
    if (!opts.length) {
      this.resetActive();
      return;
    }

    const current = this.value() ?? '';
    const idx = opts.findIndex((o) => o.value === current);
    this.setActive(idx >= 0 ? idx : 0);
  }

  toggle() {
    if (this.disabled()) return;

    const next = !this.open();
    this.open.set(next);

    if (next) this.initActive();
    else this.resetActive();
  }

  close() {
    this.open.set(false);
    this.resetActive();
  }

  select(v: string) {
    this.valueChange.emit(v);
    this.close();
  }

  onKeydown(e: KeyboardEvent) {
    if (this.disabled()) return;

    const opts = this.options() ?? [];
    const has = opts.length > 0;
    const isOpen = this.open();
    const idx = this.activeIndex();

    if (e.key === 'ArrowDown') {
      e.preventDefault();

      if (!isOpen) {
        this.open.set(true);
        this.initActive();
        return;
      }

      if (!has) return;
      const next = Math.min(idx < 0 ? 0 : idx + 1, opts.length - 1);
      this.setActive(next);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();

      if (!isOpen) {
        this.open.set(true);
        this.initActive();
        return;
      }

      if (!has) return;
      const next = Math.max(idx <= 0 ? 0 : idx - 1, 0);
      this.setActive(next);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();

      if (!isOpen) {
        this.open.set(true);
        this.initActive();
        return;
      }

      if (!has) return;
      const pickIdx = idx < 0 ? 0 : idx;
      const v = opts[pickIdx]?.value;
      if (v != null) this.select(v);
      return;
    }

    if (e.key === 'Escape') {
      if (!isOpen) return;
      e.preventDefault();
      this.close();
      return;
    }
  }
}
