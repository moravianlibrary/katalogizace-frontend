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

@Component({
  standalone: true,
  selector: 'app-textarea-autocomplete',
  imports: [CommonModule],
  templateUrl: './textarea-autocomplete.component.html',
})
export class TextareaAutocompleteComponent {
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

  private readonly skipNextFetch = signal(false);
  readonly hasEditedSinceFocus = signal(false);

  readonly query = signal('');
  readonly suggestions = signal<AutocompleteSuggestion[]>([]);

  private readonly taRef = viewChild<ElementRef<HTMLTextAreaElement>>('ta');

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
    return this.suggestions().length > 0;
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

  onFocus() {
    this.focused.set(true);
    this.hasEditedSinceFocus.set(false);
  }

  onBlur() {
    window.setTimeout(() => {
      this.focused.set(false);
      this.suggestions.set([]);
      this.loading.set(false);
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
    this.valueChange.emit('');
  }

  pick(s: AutocompleteSuggestion) {
    this.skipNextFetch.set(true);
    this.hasEditedSinceFocus.set(false);
    this.query.set(s.value);
    this.valueChange.emit(s.value);
    this.suggestions.set([]);
    this.loading.set(false);
  }
}
