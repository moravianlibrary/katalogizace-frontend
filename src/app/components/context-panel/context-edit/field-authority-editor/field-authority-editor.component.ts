import { InputAutocompleteAuthorityComponent } from '@/app/components/inputs/input-autocomplete-authority/input-autocomplete-authority.component';
import { InputDropdownComponent } from '@/app/components/inputs/input-dropdown/input-dropdown.component';
import { InputStaticAutocompleteComponent } from '@/app/components/inputs/input-static-autocomplete/input-static-autocomplete.component';
import { ExistingMarcRecordTableComponent } from '@/app/components/marc-record-table/existing-marc-record-table/existing-marc-record-table.component';
import { LockHoverIconComponent } from '@/app/components/shared/lock-hover-icon/lock-hover-icon.component';
import {
  AutocompletAuthorityResponse,
  ExistingMarcRecord,
  getIndicators,
  UUID,
} from '@/app/models';
import { CatalogueService } from '@/app/services/api/catalogue.service';
import { MarcTranslateService } from '@/app/services/marc-translate.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { NgClass } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type PaginationItem = number | 'ellipsis-left' | 'ellipsis-right';

@Component({
  selector: 'app-field-authority-editor',
  imports: [
    InputAutocompleteAuthorityComponent,
    InputDropdownComponent,
    TranslateModule,
    InputStaticAutocompleteComponent,
    NgClass,
    ExistingMarcRecordTableComponent,
    LockHoverIconComponent,
  ],
  templateUrl: './field-authority-editor.component.html',
})
export class FieldAuthorityEditorComponent {
  private readonly rs = inject(RecordStateService);
  private readonly marcT = inject(MarcTranslateService);
  private readonly catalogue = inject(CatalogueService);
  private readonly translate = inject(TranslateService);

  fieldId = input.required<UUID>();

  readonly indicators = computed(() => getIndicators(this.field()?.tag!));

  readonly ind1Options = computed(() => this.indicators().ind1);
  readonly ind2Options = computed(() => this.indicators().ind2);

  private readonly firstAutocomplete = viewChild(
    InputAutocompleteAuthorityComponent,
  );

  readonly roleItems = computed(() =>
    this.marcT.getMarcStaticValueItems('100.4'),
  );

  readonly field = computed(() => {
    const rec = this.rs.editableRecord();
    if (!rec) return null;
    return rec.data_fields.find((f) => f.fieldId === this.fieldId()) ?? null;
  });

  readonly locked = computed(() => (this.getSub('7') ?? '').trim().length > 0);

  readonly hasSub7 = computed(() => (this.getSub('7') ?? '').trim().length > 0);
  readonly hasSubd = computed(() => (this.dDraft() ?? '').trim().length > 0);

  readonly dDraft = signal<string>('');
  private readonly hasAutoFocused = signal(false);

  private readonly authorityDialog =
    viewChild<ElementRef<HTMLDialogElement>>('authorityDialog');

  constructor() {
    effect(() => {
      this.fieldId();
      this.hasAutoFocused.set(false);
    });

    effect(() => {
      this.fieldId(); // dependency
      const v = this.getSub('d') ?? '';
      this.dDraft.set(v);
    });

    effect(() => {
      const id = this.fieldId();
      const f = this.field();
      if (!id || !f) return;

      const isLocked = this.locked();
      if (isLocked) return;
      if (this.hasAutoFocused()) return;

      this.hasAutoFocused.set(true);
      queueMicrotask(() => this.firstAutocomplete()?.focus());
    });

    effect(() => {
      const id = (this.getSub('7') ?? '').trim();

      if (!id) {
        this.sevenRecord.set(null);
        this.loadedSevenId.set(null);
        return;
      }

      if (this.loadedSevenId() === id || this.loadingSevenRecord()) return;

      this.loadingSevenRecord.set(true);

      this.catalogue.getAutRecord(id, 'aut').subscribe({
        next: (record) => {
          if ((this.getSub('7') ?? '').trim() !== id) {
            this.loadingSevenRecord.set(false);
            return;
          }

          this.sevenRecord.set(record);
          this.loadedSevenId.set(id);
          this.loadingSevenRecord.set(false);
        },
        error: () => {
          if ((this.getSub('7') ?? '').trim() === id) {
            this.sevenRecord.set(null);
            this.loadedSevenId.set(null);
          }
          this.loadingSevenRecord.set(false);
          console.error(this.translate.instant('dialogs.record_load_error'));
        },
      });
    });
  }

  unlock() {
    this.clearAuthority();
  }

  setInd(which: 1 | 2, v: string) {
    const f = this.field();
    if (!f) return;
    this.rs.patchDataField(this.fieldId(), {
      [which === 1 ? 'ind1' : 'ind2']: v,
    } as any);
  }

  getSub(code: '4' | 'd' | 'a' | '7'): string {
    const f = this.field();
    if (!f) return '';
    return f.subfields?.find((s: any) => s.code === code)?.value ?? '';
  }

  setSub(code: '4' | 'd' | 'a' | '7', value: string) {
    const f = this.field();
    if (!f) return;

    const subfields = [...(f.subfields ?? [])];
    const idx = subfields.findIndex((s: any) => s.code === code);

    if (!value) {
      if (idx >= 0) subfields.splice(idx, 1);
    } else {
      if (idx >= 0) subfields[idx] = { ...subfields[idx], value };
      else subfields.push({ code, value });
    }

    this.rs.patchDataField(this.fieldId(), { subfields });

    if (code === '7') {
      const trimmed = value.trim();
      this.loadedSevenId.set(null);

      if (!trimmed) {
        this.sevenRecord.set(null);
      }
    }
  }

  onPickTerm(term: string) {
    if (this.locked()) return;
    this.setSub('a', term);
  }

  onInputD(e: Event) {
    if (this.locked()) return;
    const value = (e.target as HTMLInputElement | null)?.value ?? '';
    this.dDraft.set(value);
    this.setSub('d', value);
  }

  clearD() {
    this.dDraft.set('');
    this.setSub('d', '');
  }

  applySuggestion(s: AutocompletAuthorityResponse) {
    if (this.locked()) return;
    this.setSub('a', s.a);
    this.setSub('7', s['7'] ?? '');
    this.setSub('d', s['d'] ?? '');
  }

  clearAuthority() {
    this.setSub('a', '');
    this.setSub('7', '');
    this.setSub('d', '');
  }

  readonly searchQuery = signal('');
  readonly searchResults = signal<ExistingMarcRecord[]>([]);
  readonly selectedRecordId = signal<string | null>(null);
  readonly selectedRecordDetail = signal<ExistingMarcRecord | null>(null);
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly errorMessage = signal<string | null>(null);
  readonly limit = signal(100);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  sevenRecord = signal<ExistingMarcRecord | null>(null);
  private readonly loadingSevenRecord = signal(false);
  private readonly loadedSevenId = signal<string | null>(null);

  readonly hasNext = computed(() => this.page() * this.limit() < this.total());
  readonly hasPrev = computed(() => this.page() > 1);

  getAuthority100(record: ExistingMarcRecord) {
    return record.data_fields.find((f) => f.tag === '100') ?? null;
  }

  catalogueUrlSeven = computed<string | null>(() => {
    const rec = this.sevenRecord();
    const docNumber = this.getDocNumberFromRecord(rec);

    if (!docNumber) return null;

    return `https://aleph.nkp.cz/F/?func=direct&doc_number=${encodeURIComponent(docNumber)}&local_base=AUT`;
  });

  catalogueUrl = computed<string | null>(() => {
    const rec = this.selectedRecordDetail();
    const docNumber = this.getDocNumberFromRecord(rec);

    if (!docNumber) return null;

    return `https://aleph.nkp.cz/F/?func=direct&doc_number=${encodeURIComponent(
      docNumber,
    )}&local_base=AUT`;
  });

  private getDocNumberFromRecord(
    rec: ExistingMarcRecord | null,
  ): string | null {
    if (!rec) return null;

    const f998 = rec.data_fields.find((f) => f.tag === '998');
    const sfA = f998?.subfields?.find((sf) => sf.code === 'a');
    const value = sfA?.value?.trim();

    return value ?? null;
  }

  readonly from = computed(() => {
    if (!this.total()) return 0;
    return (this.page() - 1) * this.limit() + 1;
  });

  readonly to = computed(() => {
    if (!this.total()) return 0;
    return Math.min(this.page() * this.limit(), this.total());
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.limit())),
  );

  readonly visiblePages = computed<PaginationItem[]>(() => {
    const total = this.totalPages();
    const current = this.page();

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const windowSize = 5;
    let start = Math.max(2, current - Math.floor(windowSize / 2));
    let end = Math.min(total - 1, start + windowSize - 1);

    start = Math.max(2, end - windowSize + 1);

    const items: PaginationItem[] = [1];

    if (start > 2) {
      items.push('ellipsis-left');
    }

    for (let p = start; p <= end; p++) {
      items.push(p);
    }

    if (end < total - 1) {
      items.push('ellipsis-right');
    }

    items.push(total);

    return items;
  });

  search(page = 1) {
    this.page.set(page);

    const query = this.searchQuery().trim();

    if (!query) {
      this.searchResults.set([]);
      this.selectedRecordId.set(null);
      this.selectedRecordDetail.set(null);
      this.total.set(0);
      this.errorMessage.set(null);
      return;
    }

    this.loading.set(true);

    this.errorMessage.set(null);
    this.searchResults.set([]);
    this.selectedRecordId.set(null);
    this.selectedRecordDetail.set(null);

    this.catalogue
      .searchAuthorities({
        person_name: query,
        page,
        limit: this.limit(),
      })
      .subscribe({
        next: (resp) => {
          this.searchResults.set(resp.records ?? []);
          this.total.set(resp.total ?? 0);

          const first = resp.records?.[0] ?? null;

          if (first) {
            this.selectedRecordId.set(String(first.record_id));
            this.selectedRecordDetail.set(null);
            this.loadDetail(String(first.record_id));
          } else {
            this.selectedRecordId.set(null);
            this.selectedRecordDetail.set(null);
          }

          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.searchResults.set([]);
          this.selectedRecordId.set(null);
          this.selectedRecordDetail.set(null);
          this.total.set(0);
          this.errorMessage.set(
            this.translate.instant('dialogs.authorities_load_error'),
          );
        },
      });
  }

  clear() {
    this.searchQuery.set('');
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.search(page);
  }

  goPrevPage() {
    if (!this.hasPrev()) return;
    this.search(this.page() - 1);
  }

  goNextPage() {
    if (!this.hasNext()) return;
    this.search(this.page() + 1);
  }

  readonly skeletonRows = Array.from({ length: this.limit() });

  loadDetail(recordId: string) {
    this.detailLoading.set(true);

    this.catalogue.getAutRecord(recordId, 'aut').subscribe({
      next: (record) => {
        if (this.selectedRecordId() !== String(recordId)) {
          this.detailLoading.set(false);
          return;
        }

        this.selectedRecordDetail.set(record);
        this.detailLoading.set(false);
        this.detailError.set(null);
      },
      error: () => {
        if (this.selectedRecordId() === String(recordId)) {
          this.selectedRecordDetail.set(null);
        }
        this.detailLoading.set(false);
        this.detailError.set(
          this.translate.instant('dialogs.record_load_error'),
        );
      },
    });
  }

  selectRecord(record: ExistingMarcRecord) {
    const recordId = String(record.record_id);

    if (this.selectedRecordId() === recordId) return;

    this.selectedRecordId.set(recordId);
    this.selectedRecordDetail.set(null);
    this.loadDetail(recordId);
  }

  applyAuthority() {
    const record = this.selectedRecordDetail();
    if (!record) return;

    const field100 = record.data_fields.find((f) => f.tag === '100');
    if (!field100) return;

    const sub = (code: string) =>
      field100.subfields.find((s) => s.code === code)?.value ?? '';

    this.setSub('a', sub('a'));
    this.setSub('d', sub('d'));
    this.setSub('7', sub('7'));

    this.closeAuthorityDialog();
  }

  onAuthoritySearch() {
    const dialog = this.authorityDialog()?.nativeElement;
    if (!dialog) return;

    this.searchQuery.set(this.getSub('a') ?? '');
    this.errorMessage.set(null);
    this.searchResults.set([]);
    this.selectedRecordId.set(null);
    this.selectedRecordDetail.set(null);
    this.total.set(0);
    this.page.set(1);

    dialog.showModal();

    if (this.searchQuery().trim()) {
      this.search(1);
    }
  }

  closeAuthorityDialog() {
    this.authorityDialog()?.nativeElement.close();
  }
}
