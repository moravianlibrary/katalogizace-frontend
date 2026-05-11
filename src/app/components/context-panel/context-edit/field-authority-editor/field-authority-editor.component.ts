import {
  AddSubfieldDialogComponent,
  AddSubfieldDialogResult,
} from '@/app/components/dialogs/add-subfield-dialog/add-subfield-dialog.component';
import { ExistingMarcRecordTableComponent } from '@/app/components/marc-record-table/existing-marc-record-table/existing-marc-record-table.component';
import { IconComponent } from '@/app/components/shared/icon/icon.component';
import { InputAutocompleteAuthorityComponent } from '@/app/components/shared/inputs/input-autocomplete-authority/input-autocomplete-authority.component';
import { InputAutocompleteComponent } from '@/app/components/shared/inputs/input-autocomplete/input-autocomplete.component';
import { InputDropdownComponent } from '@/app/components/shared/inputs/input-dropdown/input-dropdown.component';
import { InputStaticAutocompleteComponent } from '@/app/components/shared/inputs/input-static-autocomplete/input-static-autocomplete.component';
import { LockHoverIconComponent } from '@/app/components/shared/lock-hover-icon/lock-hover-icon.component';
import { TablePaginationComponent } from '@/app/components/shared/table/table-pagination/table-pagination.component';
import {
  AutocompletAuthorityResponse,
  DATA_FIELD_RULES,
  ExistingMarcRecord,
  getIndicators,
  getSubfieldRuleLabel,
  isSubfieldRepeatable,
  MarcSubfield,
  UUID,
} from '@/app/models';
import { CatalogueService } from '@/app/services/api/catalogue.service';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { MarcTranslateService } from '@/app/services/marc-translate.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { bindAddSubfieldShortcut } from '@/app/utils/bind-add-subfield-shortcut';
import { compareSubfieldCodes } from '@/app/utils/marc-subfield-sort';
import { NgClass } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type PaginationItem = number | 'ellipsis-left' | 'ellipsis-right';

type VisibleSubfield = {
  kind: 'template' | 'extra';
  code: string;
  value: string;
  sourceIndex: number | null;
  templateLocked: boolean;
};

type PendingFocusTarget = {
  code: string;
  occurrence: number;
  kind: 'template' | 'extra';
} | null;

@Component({
  selector: 'app-field-authority-editor',
  standalone: true,
  imports: [
    InputAutocompleteAuthorityComponent,
    InputAutocompleteComponent,
    InputDropdownComponent,
    TranslateModule,
    InputStaticAutocompleteComponent,
    NgClass,
    ExistingMarcRecordTableComponent,
    LockHoverIconComponent,
    TablePaginationComponent,
    AddSubfieldDialogComponent,
    IconComponent,
  ],
  templateUrl: './field-authority-editor.component.html',
})
export class FieldAuthorityEditorComponent {
  private readonly rs = inject(RecordStateService);
  private readonly marcT = inject(MarcTranslateService);
  private readonly catalogue = inject(CatalogueService);
  private readonly translate = inject(TranslateService);
  private readonly cps = inject(ContextPanelService);

  private wasEditingThisField = false;

  fieldId = input.required<UUID>();

  readonly addSubfieldDialogOpen = signal(false);
  readonly addSubfieldDialogError = signal<string | null>(null);
  readonly authorityDialogOpen = signal(false);

  private readonly firstAutocomplete = viewChild(
    InputAutocompleteAuthorityComponent,
  );

  private readonly roleAutocompletes = viewChildren(
    InputStaticAutocompleteComponent,
  );

  private readonly inputAutocompletes = viewChildren(
    InputAutocompleteComponent,
  );

  readonly pendingFocusTarget = signal<PendingFocusTarget>(null);

  readonly field = computed(() => {
    const rec = this.rs.editableRecord();
    if (!rec) return null;
    return rec.data_fields.find((f) => f.fieldId === this.fieldId()) ?? null;
  });

  readonly tag = computed(() => this.field()?.tag ?? '100');

  readonly indicators = computed(() => getIndicators(this.tag()));
  readonly ind1Options = computed(() => this.indicators().ind1);
  readonly ind2Options = computed(() => this.indicators().ind2);

  readonly templateOrder = computed(() => {
    return DATA_FIELD_RULES[this.tag()]?.templateOrder ?? ['a', 'd', '7', '4'];
  });

  readonly templateCodes = computed(() => new Set(this.templateOrder()));

  readonly roleItems = computed(() =>
    this.marcT.getMarcStaticValueItems('100.4'),
  );

  readonly locked = computed(
    () => (this.getFirstSubValue('7') ?? '').trim().length > 0,
  );

  readonly visibleSubfields = computed<VisibleSubfield[]>(() => {
    const field = this.field();
    if (!field) return [];

    const subfields = field.subfields ?? [];
    const templateOrder = this.templateOrder();
    const templateItems: VisibleSubfield[] = [];

    for (const code of templateOrder) {
      const rule = DATA_FIELD_RULES[this.tag()]?.subfields?.[code];
      const matching = subfields
        .map((sf, sourceIndex) => ({ sf, sourceIndex }))
        .filter(({ sf }) => sf.code === code);

      if (rule?.repeatable) {
        if (matching.length) {
          matching.forEach(({ sf, sourceIndex }, index) => {
            templateItems.push({
              kind: 'template',
              code,
              value: sf.value,
              sourceIndex,
              templateLocked: index === 0,
            });
          });
        } else {
          templateItems.push({
            kind: 'template',
            code,
            value: '',
            sourceIndex: null,
            templateLocked: true,
          });
        }
        continue;
      }

      const first = matching[0];
      templateItems.push({
        kind: 'template',
        code,
        value: first?.sf.value ?? '',
        sourceIndex: first?.sourceIndex ?? null,
        templateLocked: true,
      });
    }

    const templateCodes = this.templateCodes();

    const extraItems: VisibleSubfield[] = subfields
      .map((sf, sourceIndex) => ({ sf, sourceIndex }))
      .filter(({ sf }) => !templateCodes.has(sf.code))
      .sort((a, b) => compareSubfieldCodes(a.sf.code, b.sf.code))
      .map(({ sf, sourceIndex }) => ({
        kind: 'extra' as const,
        code: sf.code,
        value: sf.value,
        sourceIndex,
        templateLocked: false,
      }));

    return [...templateItems, ...extraItems];
  });

  readonly extraVisibleSubfields = computed(() =>
    this.visibleSubfields().filter((sf) => sf.kind === 'extra'),
  );

  readonly nonRoleInputVisibleSubfields = computed(() =>
    this.visibleSubfields().filter(
      (sf) => sf.code !== 'a' && sf.code !== '4' && sf.code !== '7',
    ),
  );

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
  readonly sevenRecord = signal<ExistingMarcRecord | null>(null);
  private readonly loadingSevenRecord = signal(false);
  private readonly loadedSevenId = signal<string | null>(null);

  readonly hasNext = computed(() => this.page() * this.limit() < this.total());
  readonly hasPrev = computed(() => this.page() > 1);

  readonly hasSub7 = computed(
    () => (this.getFirstSubValue('7') ?? '').trim().length > 0,
  );
  readonly hasSubd = computed(() => (this.dDraft() ?? '').trim().length > 0);

  readonly dDraft = signal<string>('');
  private readonly hasAutoFocused = signal(false);

  constructor() {
    effect(() => {
      this.fieldId();
      this.hasAutoFocused.set(false);
    });

    effect(() => {
      const state = this.cps.state();
      const isEditingThisField =
        state.mode === 'edit' && state.fieldId === this.fieldId();

      if (this.wasEditingThisField && !isEditingThisField) {
        this.cleanupEmptySubfields();
      }

      this.wasEditingThisField = isEditingThisField;
    });

    effect(() => {
      this.fieldId();
      const v = this.getFirstSubValue('d') ?? '';
      this.dDraft.set(v);
    });

    effect(() => {
      const state = this.cps.state();
      const isEditingThisField =
        state.mode === 'edit' && state.fieldId === this.fieldId();

      if (!isEditingThisField) return;
      if (this.pendingFocusTarget()) return;

      const isLocked = untracked(() => this.locked());
      if (isLocked) return;
      if (this.hasAutoFocused()) return;

      this.hasAutoFocused.set(true);
      queueMicrotask(() => this.firstAutocomplete()?.focus());
    });

    effect(() => {
      const id = (this.getFirstSubValue('7') ?? '').trim();

      if (!id) {
        this.sevenRecord.set(null);
        this.loadedSevenId.set(null);
        return;
      }

      if (this.loadedSevenId() === id || this.loadingSevenRecord()) return;

      this.loadingSevenRecord.set(true);

      this.catalogue.getAutRecord(id, 'aut').subscribe({
        next: (record) => {
          if ((this.getFirstSubValue('7') ?? '').trim() !== id) {
            this.loadingSevenRecord.set(false);
            return;
          }

          this.sevenRecord.set(record);
          this.loadedSevenId.set(id);
          this.loadingSevenRecord.set(false);
        },
        error: () => {
          if ((this.getFirstSubValue('7') ?? '').trim() === id) {
            this.sevenRecord.set(null);
            this.loadedSevenId.set(null);
          }
          this.loadingSevenRecord.set(false);
          console.error(this.translate.instant('dialogs.record_load_error'));
        },
      });
    });

    effect(() => {
      const target = this.pendingFocusTarget();
      const visible = this.visibleSubfields();
      if (!target || !visible.length) return;

      queueMicrotask(() => {
        if (target.kind === 'template' && target.code === '4') {
          const roleIndexes = visible
            .map((sf, index) => ({ sf, index }))
            .filter((x) => x.sf.kind === 'template' && x.sf.code === '4')
            .map((x) => x.index);

          const visibleIndex = roleIndexes[target.occurrence - 1];
          if (visibleIndex == null) return;

          const roleVisibleIndexes = visible
            .map((sf, index) => (sf.code === '4' ? index : -1))
            .filter((index) => index !== -1);

          const roleIndex = roleVisibleIndexes.indexOf(visibleIndex);
          if (roleIndex < 0) return;

          this.roleAutocompletes()[roleIndex]?.focus();
          this.pendingFocusTarget.set(null);
          return;
        }

        if (target.code !== 'a' && target.code !== '4' && target.code !== '7') {
          const matchingIndexes = visible
            .map((sf, index) => ({ sf, index }))
            .filter(
              (x) => x.sf.kind === target.kind && x.sf.code === target.code,
            )
            .map((x) => x.index);

          const visibleIndex = matchingIndexes[target.occurrence - 1];
          if (visibleIndex == null) return;

          const inputVisibleIndexes = visible
            .map((sf, index) =>
              sf.code !== 'a' && sf.code !== '4' && sf.code !== '7'
                ? index
                : -1,
            )
            .filter((index) => index !== -1);

          const inputIndex = inputVisibleIndexes.indexOf(visibleIndex);
          if (inputIndex < 0) return;

          this.inputAutocompletes()[inputIndex]?.focus();
          this.pendingFocusTarget.set(null);
        }
      });
    });

    bindAddSubfieldShortcut({
      cps: this.cps,
      fieldId: () => this.fieldId(),
      openDialog: () => this.openAddSubfieldDialog(),
    });
  }

  ngOnDestroy(): void {
    this.cleanupEmptySubfields();
  }

  private cleanupEmptySubfields() {
    const field = this.field();
    if (!field) return;

    const current = field.subfields ?? [];
    const cleaned = current.filter((sf) => (sf.value ?? '').trim().length > 0);

    if (cleaned.length === current.length) return;

    this.rs.patchDataField(this.fieldId(), { subfields: cleaned });
  }

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

  deleteTemplateRepeatableSubfield(sourceIndex: number) {
    const field = this.field();
    if (!field) return;

    const subfields = [...(field.subfields ?? [])];
    if (sourceIndex < 0 || sourceIndex >= subfields.length) return;

    subfields.splice(sourceIndex, 1);
    this.rs.patchDataField(this.fieldId(), { subfields });
  }

  setInd(which: 1 | 2, v: string) {
    const f = this.field();
    if (!f) return;

    this.rs.patchDataField(this.fieldId(), {
      [which === 1 ? 'ind1' : 'ind2']: v,
    } as never);
  }

  getFirstSubValue(code: '4' | 'd' | 'a' | '7'): string {
    const f = this.field();
    if (!f) return '';
    return f.subfields?.find((s) => s.code === code)?.value ?? '';
  }

  setTemplateSubValue(sf: VisibleSubfield, value: string) {
    const f = this.field();
    if (!f) return;

    const subfields = [...(f.subfields ?? [])];

    if (sf.sourceIndex != null) {
      subfields[sf.sourceIndex] = {
        ...subfields[sf.sourceIndex],
        value,
      };
    } else if (value) {
      subfields.push({ code: sf.code, value });
    } else {
      return;
    }

    this.rs.patchDataField(this.fieldId(), { subfields });

    if (sf.code === '7') {
      const trimmed = value.trim();
      this.loadedSevenId.set(null);

      if (!trimmed) {
        this.sevenRecord.set(null);
      }
    }
  }

  setExtraSubValue(sourceIndex: number, value: string) {
    this.rs.patchSubfield(this.fieldId(), sourceIndex, { value });
  }

  deleteExtraSubfield(sourceIndex: number) {
    const field = this.field();
    if (!field) return;

    const subfields = [...(field.subfields ?? [])];
    if (sourceIndex < 0 || sourceIndex >= subfields.length) return;

    subfields.splice(sourceIndex, 1);
    this.rs.patchDataField(this.fieldId(), { subfields });
  }

  onPickTerm(term: string) {
    if (this.locked()) return;

    const visibleA = this.visibleSubfields().find(
      (sf) => sf.kind === 'template' && sf.code === 'a',
    );
    if (!visibleA) return;

    this.setTemplateSubValue(visibleA, term);
  }

  onInputD(value: string, sf: VisibleSubfield) {
    if (this.locked()) return;

    this.dDraft.set(value);
    this.setTemplateSubValue(sf, value);
  }

  clearD() {
    const visibleD = this.visibleSubfields().find(
      (sf) => sf.kind === 'template' && sf.code === 'd',
    );
    if (!visibleD) return;

    this.dDraft.set('');
    this.setTemplateSubValue(visibleD, '');
  }

  applySuggestion(s: AutocompletAuthorityResponse) {
    if (this.locked()) return;

    const visibleA = this.visibleSubfields().find(
      (sf) => sf.kind === 'template' && sf.code === 'a',
    );
    const visibleD = this.visibleSubfields().find(
      (sf) => sf.kind === 'template' && sf.code === 'd',
    );
    const visible7 = this.visibleSubfields().find(
      (sf) => sf.kind === 'template' && sf.code === '7',
    );

    if (visibleA) this.setTemplateSubValue(visibleA, s.a);
    if (visibleD) this.setTemplateSubValue(visibleD, s['d'] ?? '');
    if (visible7) this.setTemplateSubValue(visible7, s['7'] ?? '');
  }

  clearAuthority() {
    this.patchAuthorityTemplate({
      d: '',
      '7': '',
    });

    setTimeout(() => {
      this.firstAutocomplete()?.focus();
    });
  }

  openAddSubfieldDialog() {
    this.addSubfieldDialogError.set(null);
    this.addSubfieldDialogOpen.set(true);
  }

  closeAddSubfieldDialog() {
    this.addSubfieldDialogOpen.set(false);
    this.addSubfieldDialogError.set(null);
  }

  onAddSubfieldConfirm(result: AddSubfieldDialogResult) {
    const field = this.field();
    if (!field) return;

    const existingSubfields = [...(field.subfields ?? [])];
    const templateCodes = this.templateCodes();

    for (const code of result.subfieldCodes) {
      const isTemplateCode = templateCodes.has(code);
      const repeatable = isSubfieldRepeatable(this.tag(), code);
      const alreadyExists = existingSubfields.some((sf) => sf.code === code);

      if (isTemplateCode && !repeatable) {
        this.addSubfieldDialogError.set('subfield_add.non_repeatable_error');
        return;
      }

      if (!repeatable && alreadyExists) {
        this.addSubfieldDialogError.set('subfield_add.non_repeatable_error');
        return;
      }
    }

    const firstAddedCode = result.subfieldCodes[0] ?? null;
    const firstAddedIsTemplate =
      !!firstAddedCode && templateCodes.has(firstAddedCode);

    const existingSameCodeCount = firstAddedCode
      ? existingSubfields.filter((sf) => sf.code === firstAddedCode).length
      : 0;

    const existingExtraSameCodeCount = firstAddedCode
      ? existingSubfields.filter(
          (sf) => !templateCodes.has(sf.code) && sf.code === firstAddedCode,
        ).length
      : 0;

    const added: MarcSubfield[] = result.subfieldCodes.map((code) => ({
      code,
      value: '',
    }));

    this.rs.patchDataField(this.fieldId(), {
      subfields: [...existingSubfields, ...added],
    });

    this.pendingFocusTarget.set(
      firstAddedCode
        ? {
            code: firstAddedCode,
            kind: firstAddedIsTemplate ? 'template' : 'extra',
            occurrence: firstAddedIsTemplate
              ? existingSameCodeCount + 1
              : existingExtraSameCodeCount + 1,
          }
        : null,
    );

    this.addSubfieldDialogOpen.set(false);
    this.addSubfieldDialogError.set(null);
  }

  getSubfieldLabel(code: string): string {
    return getSubfieldRuleLabel(this.tag(), code);
  }

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

  private patchAuthorityTemplate(values: {
    a?: string;
    d?: string;
    '7'?: string;
  }) {
    const field = this.field();
    if (!field) return;

    const subfields = [...(field.subfields ?? [])];

    const upsert = (code: 'a' | 'd' | '7', value: string) => {
      const idx = subfields.findIndex((sf) => sf.code === code);

      if (!value) {
        if (idx >= 0) subfields.splice(idx, 1);
        return;
      }

      if (idx >= 0) {
        subfields[idx] = { ...subfields[idx], value };
      } else {
        subfields.push({ code, value });
      }
    };

    if ('a' in values) upsert('a', values.a ?? '');
    if ('d' in values) upsert('d', values.d ?? '');
    if ('7' in values) upsert('7', values['7'] ?? '');

    this.loadedSevenId.set(null);

    if (!(values['7'] ?? '').trim()) {
      this.sevenRecord.set(null);
    }

    this.dDraft.set(values.d ?? '');
    this.rs.patchDataField(this.fieldId(), { subfields });
  }

  applyAuthority() {
    const record = this.selectedRecordDetail();
    if (!record) return;

    const field100 = record.data_fields.find((f) => f.tag === '100');
    if (!field100) return;

    const sub = (code: string) =>
      field100.subfields.find((s) => s.code === code)?.value ?? '';

    this.patchAuthorityTemplate({
      a: sub('a'),
      d: sub('d'),
      '7': sub('7'),
    });

    this.closeAuthorityDialog();
  }

  onAuthoritySearch() {
    this.searchQuery.set(this.getFirstSubValue('a') ?? '');
    this.errorMessage.set(null);
    this.searchResults.set([]);
    this.selectedRecordId.set(null);
    this.selectedRecordDetail.set(null);
    this.total.set(0);
    this.page.set(1);

    this.authorityDialogOpen.set(true);

    if (this.searchQuery().trim()) {
      this.search(1);
    }
  }

  closeAuthorityDialog() {
    this.authorityDialogOpen.set(false);
  }
}
