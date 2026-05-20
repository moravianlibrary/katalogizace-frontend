import { AutocompleteSuggestion, CatalogueBase } from '@/app/models';
import { CatalogueService } from '@/app/services/api/catalogue.service';
import { ToastService } from '@/app/services/toast.service';
import { resolveApiErrorMessage } from '@/app/utils/api-error.util';
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
  viewChild,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-textarea-autocomplete',
  imports: [CommonModule, IconComponent],
  templateUrl: './textarea-autocomplete.component.html',
})
export class TextareaAutocompleteComponent {
  private readonly cat = inject(CatalogueService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

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

  private readonly skipNextFetch = signal(false);
  readonly hasEditedSinceFocus = signal(false);

  readonly query = signal('');
  readonly suggestions = signal<AutocompleteSuggestion[]>([]);
  readonly activeIndex = signal<number>(-1);

  private readonly taRef = viewChild<ElementRef<HTMLTextAreaElement>>('ta');
  private readonly listRef = viewChild<ElementRef<HTMLDivElement>>('list');

  private debounceTimer: number | null = null;
  private blurTimer: number | null = null;
  private reqSeq = 0;
  private lastErrorToastMessage: string | null = null;

  focus() {
    const el = this.taRef()?.nativeElement;
    if (!el) return;

    el.focus();
    const len = el.value?.length ?? 0;
    el.setSelectionRange?.(len, len);
  }

  readonly open = computed(() => {
    if (!this.focused()) return false;
    if (this.disabled()) return false;
    if (!this.hasEditedSinceFocus()) return false;

    const hasSuggestions = this.suggestions().length > 0;

    if (hasSuggestions && this.activeIndex() === -1) {
      queueMicrotask(() => this.activeIndex.set(0));
    }

    return hasSuggestions;
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

      const hasEdited = this.hasEditedSinceFocus();
      if (!hasEdited) return;

      const shouldSkip = this.skipNextFetch();
      if (shouldSkip) {
        this.skipNextFetch.set(false);
        return;
      }

      if ((q ?? '').trim().length < this.minChars()) {
        this.suggestions.set([]);
        this.loading.set(false);
        this.activeIndex.set(-1);
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
              this.activeIndex.set((res.suggestions?.length ?? 0) > 0 ? 0 : -1);
              this.lastErrorToastMessage = null;
            },
            error: (err) => {
              if (seq !== this.reqSeq) return;
              this.suggestions.set([]);
              this.loading.set(false);
              this.activeIndex.set(-1);
              this.showAutocompleteError(err);
            },
          });
      }, this.debounceMs());
    });
  }

  private showAutocompleteError(error: unknown) {
    const message = resolveApiErrorMessage(
      error,
      this.translate.instant('messages.error.autocomplete'),
    );

    if (this.lastErrorToastMessage === message) return;

    this.lastErrorToastMessage = message;
    this.toast.show(message, 'error');
  }

  private setActive(index: number) {
    this.activeIndex.set(index);
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
      this.suggestions.set([]);
      this.loading.set(false);
      this.hasEditedSinceFocus.set(false);
      this.resetActive();
      this.lastErrorToastMessage = null;
      this.blurTimer = null;
    }, 120);
  }

  onInput(v: string) {
    this.hasEditedSinceFocus.set(true);
    this.query.set(v);

    this.valueChange.emit(v);
  }

  clear() {
    if (this.blurTimer) {
      window.clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }

    this.focused.set(true);
    this.hasEditedSinceFocus.set(true);
    this.query.set('');
    this.suggestions.set([]);
    this.loading.set(false);
    this.resetActive();
    this.lastErrorToastMessage = null;
    this.valueChange.emit('');
  }

  pick(s: AutocompleteSuggestion) {
    if (this.blurTimer) {
      window.clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }

    this.skipNextFetch.set(true);
    this.hasEditedSinceFocus.set(false);
    this.query.set(s.value);
    this.valueChange.emit(s.value);
    this.suggestions.set([]);
    this.loading.set(false);
    this.resetActive();
    this.lastErrorToastMessage = null;
  }

  onKeydown(e: KeyboardEvent) {
    if (this.disabled()) return;
    if (!this.open()) return;

    const list = this.suggestions();
    if (!list.length) return;

    const idx = this.activeIndex();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(idx < 0 ? 0 : idx + 1, list.length - 1);
      this.setActive(next);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(idx <= 0 ? 0 : idx - 1, 0);
      this.setActive(next);
      return;
    }

    if (e.key === 'Enter') {
      if (idx < 0) return;
      e.preventDefault();
      const item = list[idx];
      if (item) this.pick(item);
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
