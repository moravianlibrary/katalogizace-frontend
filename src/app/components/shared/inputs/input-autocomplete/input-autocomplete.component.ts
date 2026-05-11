import { AutocompleteSuggestion, CatalogueBase } from '@/app/models';
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
import { IconComponent } from '../../icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-input-autocomplete',
  imports: [CommonModule, IconComponent],
  templateUrl: './input-autocomplete.component.html',
})
export class InputAutocompleteComponent {
  private readonly cat = inject(CatalogueService);

  value = input<string>('');
  valueChange = output<string>();

  placeholder = input<string>('');
  disabled = input<boolean>(false);

  field = input.required<string>();
  subfield = input.required<string>();

  bases = input<CatalogueBase[]>([]);
  limit = input<number>(20);

  minChars = input<number>(1);
  debounceMs = input<number>(200);

  readonly focused = signal(false);
  readonly loading = signal(false);

  readonly skipNextFetch = signal(false);
  readonly hasEditedSinceFocus = signal(false);

  readonly query = signal('');
  readonly suggestions = signal<AutocompleteSuggestion[]>([]);

  private readonly inpRef = viewChild<ElementRef<HTMLInputElement>>('inp');

  readonly activeIndex = signal<number>(-1);
  private readonly listRef = viewChild<ElementRef<HTMLDivElement>>('list');

  readonly open = computed(() => {
    if (!this.focused()) return false;
    if (this.disabled()) return false;

    const has = this.suggestions().length > 0;
    if (has && this.activeIndex() === -1) {
      queueMicrotask(() => this.activeIndex.set(0));
    }
    return has;
  });

  private debounceTimer: number | null = null;
  private reqSeq = 0;

  constructor() {
    effect(() => {
      const v = this.value() ?? '';
      if (!this.focused()) this.query.set(v);
    });

    effect(() => {
      const q = this.query();
      const isFocused = this.focused();

      if (!isFocused) return;

      const hasEdited = this.hasEditedSinceFocus();
      if (!hasEdited) return;

      const shouldSkip = untracked(() => this.skipNextFetch());
      if (shouldSkip) {
        untracked(() => this.skipNextFetch.set(false));
        return;
      }

      if ((q ?? '').trim().length < this.minChars()) {
        this.suggestions.set([]);
        this.loading.set(false);
        return;
      }

      if (this.debounceTimer) window.clearTimeout(this.debounceTimer);

      this.debounceTimer = window.setTimeout(() => {
        const seq = ++this.reqSeq;
        this.loading.set(true);

        this.cat
          .autocompleteAnakon({
            query: q,
            field: this.field(),
            subfield: this.subfield(),
            limit: this.limit(),
            bases: this.bases(),
          })
          .subscribe({
            next: (res) => {
              if (seq !== this.reqSeq) return;
              this.suggestions.set(res.suggestions ?? []);
              this.loading.set(false);
            },
            error: () => {
              if (seq !== this.reqSeq) return;
              this.suggestions.set([]);
              this.loading.set(false);
            },
          });
      }, this.debounceMs());
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
    this.focused.set(true);
    this.resetActive();
    this.hasEditedSinceFocus.set(false);
  }

  focus() {
    const el = this.inpRef()?.nativeElement;
    if (!el) return;

    el.focus();
    const len = el.value?.length ?? 0;
    el.setSelectionRange?.(len, len);
  }

  onBlur() {
    window.setTimeout(() => {
      this.focused.set(false);
      this.suggestions.set([]);
      this.loading.set(false);
      this.resetActive();
      this.hasEditedSinceFocus.set(false);
    }, 120);
  }

  onInput(v: string) {
    this.hasEditedSinceFocus.set(true);
    this.query.set(v);

    this.valueChange.emit(v);
  }

  clear() {
    this.hasEditedSinceFocus.set(true);
    this.query.set('');
    this.suggestions.set([]);
    this.loading.set(false);
    this.resetActive();
    this.valueChange.emit('');
  }

  pick(s: AutocompleteSuggestion) {
    this.skipNextFetch.set(true);
    this.hasEditedSinceFocus.set(false);
    this.query.set(s.value);
    this.valueChange.emit(s.value);
    this.suggestions.set([]);
    this.loading.set(false);
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
}
