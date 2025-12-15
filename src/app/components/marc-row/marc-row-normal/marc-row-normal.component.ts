import { CommonModule } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { MarcCandidate, UUID } from '../../../models/book';
import { RecordStateService } from '../../../services/record-state.service';
import { WorkingPanelService } from '../../../services/working-panel.service';
import { RecordStore } from '../../../stores/record.store';

@Component({
  standalone: true,
  selector: 'tr[appMarcRowNormal]',
  imports: [CommonModule],
  templateUrl: './marc-row-normal.component.html',
})
export class MarcRowNormalComponent {
  nf = input.required<{
    fieldId?: UUID;
    tag: string;
    ind1?: string;
    ind2?: string;
    subfields?: { code: string; value: string }[];
    candidates?: MarcCandidate[];
    selectedCandidateId?: UUID | null;
    score?: number;
  }>();

  private wps = inject(WorkingPanelService);
  private store = inject(RecordStore);

  private lastAppliedCandidateId: string | null = null;

  private applyFx = effect(() => {
    const evt = this.wps.applyCandidate();
    if (!evt) return;

    const f = this.nf();
    if (evt.fieldId !== f.fieldId) return;

    if (this.lastAppliedCandidateId === evt.candidate.id) return;

    const rep = evt.candidate.MARC_representation;
    f.ind1 = rep.ind1 ?? '';
    f.ind2 = rep.ind2 ?? '';
    f.subfields = rep.subfields ?? [];
    f.selectedCandidateId = evt.candidate.id;
    f.score = evt.candidate.score;

    this.lastAppliedCandidateId = evt.candidate.id;

    this.notifyChange();
  });

  notifyChange() {
    this.recordState.touch();
  }

  onShowCandidates() {
    this.wps.showCandidates(
      this.nf().tag,
      this.nf().fieldId!,
      this.nf().candidates!,
      this.nf().selectedCandidateId ?? '',
    );
  }

  recordState = inject(RecordStateService);

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
    const nf = this.nf();
    if (!nf.fieldId || !nf.selectedCandidateId) return;

    const steps = this.store.provenance()[nf.selectedCandidateId] ?? [];
    const title = `Jak jsme získali pole ${nf.tag}?`;
    this.wps.showProvenance(title, steps, nf.fieldId);
  }
}
