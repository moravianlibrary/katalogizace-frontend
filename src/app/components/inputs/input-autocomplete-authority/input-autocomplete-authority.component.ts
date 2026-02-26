import {
  AutocompletAuthorityResponse,
  AutocompletDictionaryResponse,
} from '@/app/models';
import { CatalogueService } from '@/app/services/api/catalogue.service';
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-input-autocomplete-authority',
  imports: [CommonModule],
  templateUrl: './input-autocomplete-authority.component.html',
})
export class InputAutocompleteAuthorityComponent {
  private readonly cat = inject(CatalogueService);

  picked = output<AutocompletAuthorityResponse>();

  value = input<string>('');
  valueChange = output<string>();

  placeholder = input<string>('');
  disabled = input<boolean>(false);

  limit = input<number>(20);
  minChars = input<number>(1);
  debounceMs = input<number>(200);

  readonly focused = signal(false);
  readonly loading = signal(false);

  readonly skipNextFetch = signal(false);

  readonly query = signal('');
  readonly suggestions = signal<AutocompletAuthorityResponse[]>([]);

  readonly activeIndex = signal<number>(-1);

  private debounceTimer: number | null = null;
  private reqSeq = 0;

  private readonly inpRef = viewChild<ElementRef<HTMLInputElement>>('inp');
  private readonly listRef = viewChild<ElementRef<HTMLDivElement>>('list');

  focus() {
    const el = this.inpRef()?.nativeElement;
    if (!el) return;
    el.focus();
    const len = el.value?.length ?? 0;
    el.setSelectionRange?.(len, len);
  }

  readonly open = computed(() => {
    if (!this.focused()) return false;
    if (this.disabled()) return false;

    const has = this.suggestions().length > 0;
    if (has && this.activeIndex() === -1)
      queueMicrotask(() => this.activeIndex.set(0));
    return has;
  });

  constructor() {
    effect(() => {
      const v = this.value() ?? '';
      if (!this.focused()) this.query.set(v);
    });

    effect(() => {
      const q = this.query();
      const isFocused = this.focused();
      if (!isFocused) return;

      const shouldSkip = untracked(() => this.skipNextFetch());
      if (shouldSkip) {
        untracked(() => this.skipNextFetch.set(false));
        return;
      }

      if ((q ?? '').trim().length < this.minChars()) {
        this.suggestions.set([]);
        this.loading.set(false);
        this.resetActive();
        return;
      }

      if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => {
        const seq = ++this.reqSeq;
        this.loading.set(true);

        this.cat
          .autocompleteAnakonAuthority({
            query: q,
            limit: this.limit(),
          })
          .subscribe({
            next: (res: AutocompletAuthorityResponse[]) => {
              if (seq !== this.reqSeq) return;

              this.suggestions.set(res);
              this.loading.set(false);

              if (!res.length) this.resetActive();
            },
            error: () => {
              if (seq !== this.reqSeq) return;
              this.suggestions.set([]);
              this.loading.set(false);
              this.resetActive();
            },
          });
      }, this.debounceMs());
    });
  }

  onFocus() {
    this.focused.set(true);
    this.resetActive();

    if ((this.query() ?? '').trim().length >= this.minChars()) {
      this.query.update((x) => x);
    }
  }

  onBlur() {
    window.setTimeout(() => {
      this.focused.set(false);
      this.suggestions.set([]);
      this.loading.set(false);
      this.resetActive();
    }, 120);
  }

  onInput(v: string) {
    this.query.set(v);
    this.valueChange.emit(v);
  }

  clear() {
    this.query.set('');
    this.suggestions.set([]);
    this.loading.set(false);
    this.resetActive();
    this.valueChange.emit('');
  }

  pick(s: AutocompletAuthorityResponse) {
    this.skipNextFetch.set(true);
    this.query.set(s.a);
    this.valueChange.emit(s.a);
    this.suggestions.set([]);
    this.loading.set(false);
    this.picked.emit(s);
    this.resetActive();
  }

  onKeydown(e: KeyboardEvent) {
    if (this.disabled()) return;

    const hasList = this.suggestions().length > 0;
    const idx = this.activeIndex();

    if (e.key === 'ArrowDown') {
      e.preventDefault();

      if (!hasList) {
        this.focused.set(true);
        this.query.update((x) => x);
        return;
      }

      const next = Math.min(
        idx < 0 ? 0 : idx + 1,
        this.suggestions().length - 1,
      );
      this.setActive(next);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!hasList) return;

      const next = Math.max(idx <= 0 ? 0 : idx - 1, 0);
      this.setActive(next);
      return;
    }

    if (e.key === 'Enter') {
      if (!hasList) return;
      if (idx < 0) return;

      e.preventDefault();
      const s = this.suggestions()[idx];
      if (s) this.pick(s);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.suggestions.set([]);
      this.loading.set(false);
      this.resetActive();
      return;
    }
  }

  private setActive(i: number) {
    this.activeIndex.set(i);
    this.scrollActiveIntoViewSmooth();
  }

  private scrollActiveIntoViewSmooth() {
    requestAnimationFrame(() => {
      const listEl = this.listRef()?.nativeElement;
      if (!listEl) return;

      const idx = this.activeIndex();
      const item = listEl.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
      if (!item) return;

      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  private resetActive() {
    this.activeIndex.set(-1);
  }

  getActive(): AutocompletDictionaryResponse | null {
    const i = this.activeIndex();
    const list = this.suggestions();
    return i >= 0 && i < list.length ? list[i] : null;
  }
}
