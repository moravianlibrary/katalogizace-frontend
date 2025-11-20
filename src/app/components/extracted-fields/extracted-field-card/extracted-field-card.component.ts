import { CommonModule } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MarcSubfield,
  Step,
  UiFieldWithMeta,
  UiSubfield,
} from '../../../models/book';
import { RecordStateService } from '../../../services/record-state.service';
import { WorkingPanelService } from '../../../services/working-panel.service';

@Component({
  standalone: true,
  selector: 'app-extracted-field-card',
  imports: [CommonModule, FormsModule],
  templateUrl: './extracted-field-card.component.html',
})
export class ExtractedFieldCardComponent {
  field = input.required<UiFieldWithMeta>();
  provenance = input<Record<string, Step[]>>({});

  wps = inject(WorkingPanelService);

  private recordState = inject(RecordStateService);

  notifyChange() {
    this.recordState.touch();
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

  onShowCandidates() {
    this.wps.showCandidates(
      this.field().tag,
      this.field().extractedFieldId,
      this.field().candidates!,
      this.field().candidateId,
    );
  }

  onAddSubfield() {
    const f = this.field();
    if (!f.subfields) {
      f.subfields = [];
    }

    const sf = { code: '', value: '', isManual: true };
    f.subfields.push(sf);
    this.notifyChange();
  }

  onDeleteField() {}

  isCodeEditable(sf: UiSubfield): boolean {
    return !!sf.isManual;
  }

  hasCodeCollision(sf: UiSubfield, f: UiFieldWithMeta): boolean {
    if (
      (f.tag === '100' || f.tag === '700') &&
      (sf.code === 'a' || sf.code === 'd')
    ) {
      const subfields = f.subfields ?? [];
      let count = 0;
      for (const other of subfields) {
        if ((other.code ?? '').trim() === sf.code) {
          count++;
        }
      }
      return count > 1;
    }
    return false;
  }

  private applyFx = effect(() => {
    const evt = this.wps.applyCandidate();
    if (!evt) {
      return;
    }

    const f = this.field();
    if (evt.fieldId !== f.extractedFieldId) {
      return;
    }

    const rep = evt.candidate.marc_representation;
    f.ind1 = rep.ind1 ?? '';
    f.ind2 = rep.ind2 ?? '';
    f.subfields = rep.subfields ?? [];
    f.candidateId = evt.candidate.id;
    f.score = evt.candidate.score;

    this.wps.applyCandidate.set(null);
    this.notifyChange();
  });

  onShowProvenance() {
    const f = this.field();
    if (!f.candidateId) {
      return;
    }
    const steps = this.provenance()[f.candidateId] ?? [];
    const title = `Jak jsme získali pole ${f.tag}?`;
    this.wps.showProvenance(title, steps, f.extractedFieldId);
  }

  get isActive() {
    return (
      this.wps.state().mode !== 'records' &&
      this.wps.state().fieldId === this.field().extractedFieldId
    );
  }

  isValueDisabled(sf: MarcSubfield, f: UiFieldWithMeta) {
    return (
      sf.code === '7' &&
      (f.tag === '100' ||
        f.tag === '700' ||
        f.tag === '600' ||
        f.tag === '650' ||
        f.tag === '655')
    );
  }
}
