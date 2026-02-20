import {
  MarcCandidate,
  MarcSubfield,
  SubDiffIndex,
  SubDiffKind,
  UUID,
} from '@/app/models';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { ContextPanelService } from '../../../services/context-panel.service';
import { RecordStateService } from '../../../services/record-state.service';
import { RecordStore } from '../../../stores/record.store';

import { FieldEditService } from '@/app/services/edit.service';
import {
  dataSignature,
  enumerateSubfields,
  isDiffableTag015to830,
} from '../../../utils/marc-diff';

@Component({
  standalone: true,
  selector: 'tr[appMarcRowData]',
  imports: [CommonModule],
  templateUrl: './marc-row-data.component.html',
})
export class MarcRowDataComponent {
  df = input.required<{
    fieldId?: UUID;
    tag: string;
    ind1?: string;
    ind2?: string;
    subfields?: MarcSubfield[];
    candidates?: MarcCandidate[];
    selectedCandidateId?: UUID | null;
    score?: number;
  }>();

  diffIndex = input<SubDiffIndex | null>(null);
  diffSide = input<'opened' | 'preview'>('opened');
  editable = input<boolean>(false);

  onDeleteField() {
    this.recordState.removeField(this.df().fieldId!);
    this.edit.field.set(null);
    this.cps.setMode('records');
  }

  private cps = inject(ContextPanelService);
  private store = inject(RecordStore);
  private recordState = inject(RecordStateService);
  private edit = inject(FieldEditService);

  notifyChange() {
    this.recordState.touch();
  }

  onShowCandidates() {
    this.cps.showCandidates(
      this.df().tag,
      this.df().fieldId!,
      this.df().candidates!,
      this.df().selectedCandidateId ?? '',
    );
  }

  private readonly SCORE_CLASS: Record<number, string> = {
    0: 'bg-main-success-rate-0-10',
    10: 'bg-main-success-rate-10-20',
    20: 'bg-main-success-rate-20-30',
    30: 'bg-main-success-rate-30-40',
    40: 'bg-main-success-rate-40-50',
    50: 'bg-main-success-rate-50-60',
    60: 'bg-main-success-rate-60-70',
    70: 'bg-main-success-rate-70-80',
    80: 'bg-main-success-rate-80-90',
    90: 'bg-main-success-rate-90-100',
  };

  scoreClass(score?: number | null): string {
    const pct = Math.max(0, Math.min(100, Math.round((score ?? 0) * 100)));

    const bucket = pct === 100 ? 90 : Math.floor(pct / 10) * 10;

    return this.SCORE_CLASS[
      bucket as 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90
    ];
  }

  onShowProvenance() {
    const df = this.df();
    if (!df.fieldId || !df.selectedCandidateId) return;

    const tag = df.tag;
    const steps = this.store.provenance()[df.selectedCandidateId] ?? [];
    this.cps.showProvenance(tag, steps, df.fieldId);
  }

  private fieldKey = computed(() => {
    const f = this.df();
    return dataSignature({
      tag: f.tag,
      ind1: f.ind1 ?? '',
      ind2: f.ind2 ?? '',
      subfields: (f.subfields ?? []).map((sf) => ({
        code: sf.code,
        value: sf.value,
      })),
    });
  });

  subfieldsEnumerated = computed(() => {
    const f = this.df();
    return enumerateSubfields(
      (f.subfields ?? []).map((sf) => ({ code: sf.code, value: sf.value })),
    );
  });

  subDiffKindAt(i: number): SubDiffKind | null {
    const f = this.df();
    if (!isDiffableTag015to830(f.tag)) return null;

    const idx = this.diffIndex();
    if (!idx) return null;

    const side = this.diffSide();
    const perField = idx[side].get(this.fieldKey());
    if (!perField) return null;

    const entry = this.subfieldsEnumerated()[i];
    if (!entry) return null;

    return perField.get(entry.key) ?? null;
  }

  subDiffClass(kind: SubDiffKind | null): string {
    switch (kind) {
      case 'same':
        return 'bg-green-100 text-green-900';
      case 'changed':
        return 'bg-red-100 text-red-900';
      case 'missing_or_extra':
        return 'bg-orange-100 text-orange-900';
      default:
        return '';
    }
  }
}
