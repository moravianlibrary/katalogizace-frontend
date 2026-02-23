import { AutocompleteSuggestion, CatalogueBase } from '@/app/models';
import { CatalogueService } from '@/app/services/api/catalogue.service';
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
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

  readonly query = signal('');
  readonly suggestions = signal<AutocompleteSuggestion[]>([]);

  readonly open = computed(() => {
    if (!this.focused()) return false;
    if (this.disabled()) return false;
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
    if ((this.query() ?? '').trim().length >= this.minChars()) {
      this.query.update((x) => x);
    }
  }

  onBlur() {
    window.setTimeout(() => {
      this.focused.set(false);
      this.suggestions.set([]);
      this.loading.set(false);
    }, 120);
  }

  onInput(v: string) {
    this.query.set(v);

    this.valueChange.emit(v);
  }

  clear() {
    this.query.set('');
    this.suggestions.set([]);
    this.valueChange.emit('');
  }

  pick(s: AutocompleteSuggestion) {
    this.skipNextFetch.set(true);
    this.query.set(s.value);
    this.valueChange.emit(s.value);
    this.suggestions.set([]);
  }
}
