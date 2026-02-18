import {
  ApplyCandidateEvent,
  MarcCandidate,
  PanelMode,
  PanelState,
  Step,
  UUID,
} from '@/app/models';
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ContextPanelService {
  readonly state = signal<PanelState>({ mode: 'records' });

  readonly applyCandidate = signal<ApplyCandidateEvent | null>(null);

  setMode(mode: PanelMode, partial: Partial<PanelState> = {}) {
    const cleared: PanelState = {
      mode,
      tag: undefined,
      candidates: undefined,
      steps: undefined,
      fieldId: undefined,
      subfields: undefined,
      selectedCandidateId: undefined,
    };
    this.state.set({ ...cleared, ...partial });
  }

  showRecords() {
    this.setMode('records');
  }

  showCandidates(
    tag: string,
    fieldId: UUID,
    candidates: MarcCandidate[],
    selectedCandidateId: UUID,
  ) {
    this.setMode('candidates', {
      tag,
      fieldId,
      candidates,
      selectedCandidateId,
    });
  }

  confirmCandidate(candidateId: UUID) {
    const s = this.state();
    if (
      s.mode !== 'candidates' ||
      !s.fieldId ||
      !s.tag ||
      !s.candidates?.length
    ) {
      return;
    }

    const cand = s.candidates.find((c) => c.id === candidateId);
    if (!cand) {
      return;
    }

    this.applyCandidate.set({
      fieldId: s.fieldId,
      tag: s.tag,
      candidate: cand,
    });

    this.showRecords();
  }

  setSelectedCandidateId(id: UUID) {
    this.state.update((s) => ({ ...s, selectedCandidateId: id }));
  }

  showProvenance(tag: string, steps: Step[], fieldId: UUID) {
    this.setMode('provenance', { tag, steps, fieldId });
  }
}
